"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { ordersApi, type CreateOrderBody } from "@/lib/api/orders";
import { paymentsApi, type PaymentBody, type PaymentConfig } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/client";
import {
  useCartStore,
  type CartItem,
  type PickupMethod,
} from "@/store/useCartStore";

export interface OrderConfirmationResult {
  order_id: string;
  order_code: string;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  total: number;
  promotionCode: string;
  pickupMethod: PickupMethod;
  onPaymentSuccess: (result: OrderConfirmationResult) => void;
}
const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
export default function PaymentModal({
  isOpen,
  onClose,
  selectedItems,
  total,
  promotionCode,
  pickupMethod,
  onPaymentSuccess,
}: Props) {
  const router = useRouter();
  const saved = useCartStore((s) => s.checkout);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [method, setMethod] = useState<"momo" | "banking">("momo");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [channel, setChannel] = useState<PaymentBody["bank_code"] | "">("VNPAYQR");
  const [outcome, setOutcome] = useState<"SUCCESS" | "FAILED">("SUCCESS");
  const [success, setSuccess] = useState<OrderConfirmationResult | null>(null);
  const [cardType, setCardType] = useState<"VNBANK" | "INTCARD">("VNBANK");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<{
    subtotal: number;
    discount: number;
    total: number;
  } | null>(null);
  const [body, setBody] = useState<CreateOrderBody | null>(null);
  const submitting = useRef(false);
  const ownCheckout = saved?.userId === userId ? saved : null;
  const chosenChannel = ownCheckout?.paymentBody ? (ownCheckout.paymentBody.bank_code ?? "") : channel;

  useEffect(() => {
    let active = true;
    paymentsApi.config().then((value) => {
      if (active) setConfig(value);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không tải được phương thức thanh toán.");
    });
    authApi
      .me()
      .then((user) => {
        if (!active) return;
        setUserId(user.user_id);
        setName(user.name);
        setPhone(user.phone);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401)
          router.push("/signin?next=%2Fcart");
        else
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được tài khoản.",
          );
      });
    return () => {
      active = false;
    };
  }, [router]);
  if (!isOpen) return null;

  async function review() {
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload: CreateOrderBody = {
        items: selectedItems.map((i) => ({
          product_id: i.product_id,
          size: i.size,
          quantity: i.quantity,
          topping_ids: i.toppings.map((t) => t.topping_id),
          ...(i.note?.trim() ? { note: i.note.trim() } : {}),
        })),
        pickup_method: pickupMethod,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        ...(address.trim() ? { delivery_address: address.trim() } : {}),
        ...(note.trim() ? { order_note: note.trim() } : {}),
        ...(scheduled
          ? { scheduled_at: new Date(scheduled).toISOString() }
          : {}),
        ...(promotionCode ? { promotion_code: promotionCode } : {}),
      };
      const current = await ordersApi.quote(payload);
      setQuote(current);
      setBody(payload);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không xác nhận được giá.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (submitting.current || !config || !config.configured || !userId || (!body && !ownCheckout)) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      let checkout = ownCheckout;
      if (!checkout) {
        if (!body) return;
        checkout = {
          userId,
          quotedTotal: quote?.total,
          key: crypto.randomUUID(),
          paymentKey: crypto.randomUUID(),
          body,
          rows: selectedItems.map((i) => ({
            cart_item_id: i.cart_item_id,
            quantity: i.quantity,
          })),
        };
        useCartStore.getState().setCheckout(checkout);
      }
      // Reuse the exact persisted body/key after network failure or page refresh.
      const order = await ordersApi.create(checkout.body, checkout.key);
      checkout = { ...checkout, orderId: order.order_id };
      useCartStore.getState().setCheckout(checkout);
      if (["PAID", "PREPARING", "READY", "COMPLETED"].includes(order.status)) {
        useCartStore.getState().finishCheckout(order.order_id);
        onPaymentSuccess(order);
        setSuccess(order);
        return;
      }
      if (order.status === "CANCELLED") {
        useCartStore.getState().setCheckout(null);
        setBody(null);
        setQuote(null);
        throw new Error(
          "Đơn trước đã hết hạn hoặc đã hủy. Kiểm tra giỏ hàng và đặt lại.",
        );
      }
      if (
        checkout.quotedTotal !== undefined &&
        checkout.quotedTotal !== order.total
      ) {
        useCartStore
          .getState()
          .setCheckout({ ...checkout, quotedTotal: order.total });
        setQuote({
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
        });
        throw new Error(
          "Giá vừa thay đổi. Vui lòng xem tổng mới và xác nhận thanh toán lại.",
        );
      }
      const paymentBody: PaymentBody = checkout.paymentBody ?? {
        order_id: order.order_id,
        method: config.provider === "mock" ? method : "vnpay",
        ...(config.provider === "vnpay" && channel ? { bank_code: channel } : {}),
        ...(config.allow_simulate ? { simulate_result: outcome } : {}),
      };
      checkout = { ...checkout, paymentBody };
      useCartStore.getState().setCheckout(checkout);
      const result = await paymentsApi.create(paymentBody, checkout.paymentKey);
      if (result.payment_status === "success") {
        useCartStore.getState().finishCheckout(order.order_id);
        onPaymentSuccess(order);
        setSuccess(order);
        return;
      }
      if (result.payment_status === "failed") {
        useCartStore
          .getState()
          .setCheckout({
            ...checkout,
            paymentKey: crypto.randomUUID(),
            paymentBody: undefined,
          });
        throw new Error(
          "Thanh toán không thành công. Giỏ hàng được giữ nguyên; bạn có thể thử lại đơn này.",
        );
      }
      if (!result.payment_url)
        throw new Error(
          "Chưa nhận được đường dẫn thanh toán. Hãy kiểm tra trạng thái đơn.",
        );
      const url = new URL(result.payment_url);
      if (url.protocol !== "https:" || url.hostname !== "sandbox.vnpayment.vn")
        throw new Error("Đường dẫn VNPay không hợp lệ.");
      window.location.assign(url.toString());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không kết nối được. Hãy thử lại cùng đơn.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function cancelSaved() {
    if (!ownCheckout || busy) return;
    setBusy(true);
    setError("");
    try {
      // The original create response may have been lost. Replay its key to resolve it first.
      const order = await ordersApi.create(ownCheckout.body, ownCheckout.key);
      await ordersApi.cancel(order.order_id);
      useCartStore.getState().setCheckout(null);
      setQuote(null);
      setBody(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa hủy được đơn.");
    } finally {
      setBusy(false);
    }
  }
  if(success)return <div className="checkout-overlay" role="dialog" aria-modal="true" aria-label="Successful order"><section className="checkout-panel text-center"><h2>Successful!</h2><p>Thank you for your order!</p><div className="my-12 space-y-6"><p className="rounded-xl border border-[#b79c87] p-4">Order ID: <strong>#{success.order_code}</strong></p><p className="rounded-xl border border-[#b79c87] p-4">Order status: <strong>Paid</strong></p></div><div className="checkout-actions"><button onClick={()=>router.push(`/orders/${success.order_id}`)}>TRACK ORDER</button><button onClick={()=>router.push('/')}>BACK TO HOME</button></div></section></div>;
  return (
    <div
      className="checkout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <section className="checkout-panel">
        <button onClick={onClose} disabled={busy} className="mb-5 underline">
          ← Về giỏ hàng
        </button>
        <h2 id="checkout-title" className="mb-6 text-2xl font-bold">
          {quote || ownCheckout ? "Payment" : "Thông tin nhận hàng"}
        </h2>
        {!quote && !ownCheckout ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void review();
            }}
            className="space-y-4"
          >
            <Field
              label="Họ tên"
              value={name}
              change={setName}
              required
              maxLength={100}
            />
            <Field
              label="Số điện thoại"
              value={phone}
              change={setPhone}
              required
              maxLength={20}
            />
            {pickupMethod === "DELIVERY" && (
              <Field
                label="Địa chỉ giao hàng"
                value={address}
                change={setAddress}
                required
                maxLength={500}
              />
            )}
            <Field
              label="Ghi chú"
              value={note}
              change={setNote}
              maxLength={500}
            />
            <label className="block text-sm">
              Hẹn giờ nhận (bỏ trống để nhận sớm nhất)
              <input
                type="datetime-local"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            <p>Giá tạm tính: {money(total)}</p>
            <button
              disabled={busy || !userId || !config}
              className="w-full rounded-full bg-[#2b100c] p-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? "Đang kiểm tra..." : "Kiểm tra giá và tiếp tục"}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {ownCheckout && (
              <div className="rounded-xl bg-[#eae2da] p-4 text-sm">
                Bạn có một lần đặt hàng chưa hoàn tất. Tiếp tục sẽ dùng lại đơn
                và giao dịch đã tạo.
                <br />
                <button
                  disabled={busy}
                  onClick={() => void cancelSaved()}
                  className="mt-2 underline"
                >
                  Hủy đơn chưa thanh toán để sửa giỏ hàng
                </button>
              </div>
            )}
            {!quote && ownCheckout?.quotedTotal !== undefined && (
              <p className="font-bold">
                Tổng đã xác nhận: {money(ownCheckout.quotedTotal)}
              </p>
            )}
            {quote && (
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt>Tiền món</dt>
                  <dd>{money(quote.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Giảm giá</dt>
                  <dd>{money(quote.discount)}</dd>
                </div>
                <div className="flex justify-between border-t pt-3 font-bold">
                  <dt>Tổng đã xác nhận</dt>
                  <dd>{money(quote.total)}</dd>
                </div>
              </dl>
            )}
            <p className="text-sm">
              Đơn sẽ giữ hàng tối đa 20 phút trước khi thanh toán. Kết quả giao
              dịch {config?.provider === "mock" ? "được giả lập cho bài tập, không trừ tiền thật." : "do VNPay xác nhận."}
            </p>
            {config?.provider === 'vnpay' && !config.configured && <p role="alert" className="form-error">VNPay Sandbox chưa được cửa hàng cấu hình. Hiện chưa thể thanh toán.</p>}
            <div className="payment-choices">
              {config?.provider === 'mock' ? ([{value:'momo',label:'E-Wallets (giả lập)'},{value:'banking',label:'Credit / Debit Card (giả lập)'}] as const).map(c=><label key={c.value} className={'payment-choice '+((ownCheckout?.paymentBody?.method??method)===c.value?'selected':'')}><input type="radio" name="method" checked={(ownCheckout?.paymentBody?.method??method)===c.value} disabled={busy||!!ownCheckout?.paymentBody} onChange={()=>setMethod(c.value)}/>{c.label}</label>) : ([{value:'VNPAYQR',label:'VietQR · VNPay QR'},{value:'',label:'E-Wallets · chọn tại VNPay'},{value:cardType,label:'Credit / Debit Card'}] as const).map(c=><label key={c.label} className={'payment-choice '+(chosenChannel===c.value?'selected':'')}><input type="radio" name="channel" checked={chosenChannel===c.value} disabled={busy||!!ownCheckout?.paymentBody} onChange={()=>setChannel(c.value)}/>{c.label}</label>)}
            </div>
            {config?.provider==='vnpay' && <>
              {(channel==='VNBANK'||channel==='INTCARD')&&<label className="block text-sm">Loại thẻ <select aria-label="Loại thẻ" className="ml-3 rounded border p-2" value={cardType} disabled={busy||!!ownCheckout?.paymentBody} onChange={e=>{const v=e.target.value as 'VNBANK'|'INTCARD';setCardType(v);setChannel(v)}}><option value="VNBANK">ATM / tài khoản nội địa</option><option value="INTCARD">Thẻ quốc tế</option></select></label>}
              <p className="text-sm">QR và biểu mẫu thẻ được hiển thị tại VNPay Sandbox. Nếu không có ví bạn muốn dùng, hãy chọn QR hoặc thẻ.</p>
            </>}
            {config?.allow_simulate && (
              <label className="block text-sm">
                Kết quả thanh toán giả lập
                <select
                  value={ownCheckout?.paymentBody?.simulate_result ?? outcome}
                  disabled={busy || !!ownCheckout?.paymentBody}
                  onChange={(e) =>
                    setOutcome(e.target.value as "SUCCESS" | "FAILED")
                  }
                  className="ml-3 border p-2"
                >
                  <option value="SUCCESS">Thành công</option>
                  <option value="FAILED">Thất bại</option>
                </select>
              </label>
            )}
            {!ownCheckout && (
              <button
                disabled={busy}
                onClick={() => {
                  setQuote(null);
                  setBody(null);
                }}
                className="underline"
              >
                Sửa thông tin
              </button>
            )}
            <button
              disabled={busy || !config?.configured}
              onClick={() => void pay()}
              className="w-full rounded-full bg-[#2b100c] p-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? "Đang xử lý..." : "CONFIRM · Tiếp tục thanh toán"}
            </button>
            {ownCheckout?.orderId && (
              <button
                className="underline"
                onClick={() => router.push(`/orders/${ownCheckout.orderId}`)}
              >
                Xem trạng thái đơn
              </button>
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
function Field({
  label,
  value,
  change,
  required,
  maxLength,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  required?: boolean;
  maxLength: number;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        value={value}
        onChange={(e) => change(e.target.value)}
        required={required}
        maxLength={maxLength}
        className="mt-2 w-full rounded-full border border-[#9b7d68] px-4 py-3"
      />
    </label>
  );
}
