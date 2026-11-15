"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ordersApi, type OrderDetail as Detail } from "@/lib/api/orders";
import {
  paymentsApi,
  type PaymentBody,
  type PaymentConfig,
} from "@/lib/api/payments";
import { authApi, type UserProfile } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "@/store/useCartStore";
import { openVnpay, syncCheckoutWithOrder } from "@/lib/checkout/sync";
import { OrderStatus } from "./order-status";
import PaymentHistory from "./payment-history";
const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
export default function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Detail | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [uncertain, setUncertain] = useState(false);
  const [reason, setReason] = useState("");
  const [channel, setChannel] = useState("");
  const [method, setMethod] = useState<"momo" | "banking">("banking");
  const [outcome, setOutcome] = useState<"SUCCESS" | "FAILED">("SUCCESS");
  const working = useRef(false);
  const intent = useRef<{ key: string; body: PaymentBody } | null>(null);
  function accept(row: Detail) {
    setOrder(row);
    syncCheckoutWithOrder(row);
    if (
      row.payment?.idempotency_key === intent.current?.key &&
      row.payment?.status !== "pending"
    ) {
      intent.current = null;
      setUncertain(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function load() {
      if (loading || controller.signal.aborted) return;
      loading = true;
      try {
        const [u, row, settings] = await Promise.all([
          authApi.me(),
          ordersApi.one(id, controller.signal),
          paymentsApi.config(),
        ]);
        if (controller.signal.aborted) return;
        setUser(u);
        useCartStore.getState().bindUser(u.user_id);
        setConfig(settings);
        setNow(Date.now());
        accept(row);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401)
          router.replace(`/signin?next=${encodeURIComponent("/orders/" + id)}`);
        else setError(e instanceof Error ? e.message : "Không tải được đơn.");
      } finally {
        loading = false;
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [id, router]);
  async function action(kind: "cancel" | "pay" | "reconcile") {
    if (!order || !config || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "cancel") {
        accept(
          await ordersApi.cancel(
            id,
            reason.trim() || "Khách yêu cầu hủy/đổi món",
          ),
        );
      } else if (kind === "reconcile" && order.payment) {
        const result = await paymentsApi.reconcile(order.payment.payment_id);
        if (result.message) setError(result.message);
        accept(await ordersApi.one(id));
      } else {
        const fresh = await ordersApi.one(id);
        accept(fresh);
        if (fresh.actions.can_resume_payment && fresh.payment?.payment_url) {
          openVnpay(fresh.payment.payment_url);
          return;
        }
        if (!fresh.actions.can_retry_payment)
          throw new Error(
            fresh.message ??
              "Đơn chưa thể thanh toán. Hãy kiểm tra trạng thái.",
          );
        const body: PaymentBody = {
          order_id: id,
          method: config.provider === "vnpay" ? "vnpay" : method,
          ...(config.provider === "vnpay" && channel
            ? { bank_code: channel as PaymentBody["bank_code"] }
            : {}),
          ...(config.allow_simulate ? { simulate_result: outcome } : {}),
        };
        intent.current ??= { key: crypto.randomUUID(), body };
        setUncertain(true);
        const state = useCartStore.getState();
        if (state.checkout?.orderId === id)
          state.setCheckout({
            ...state.checkout,
            paymentKey: intent.current.key,
            paymentBody: intent.current.body,
          });
        const result = await paymentsApi.create(
          intent.current.body,
          intent.current.key,
        );
        if (intent.current) intent.current.key = result.idempotency_key;
        if (result.payment_status !== "pending") {
          intent.current = null;
          setUncertain(false);
        }
        if (result.payment_url) {
          openVnpay(result.payment_url);
          return;
        }
        accept(await ordersApi.one(id));
        if (result.payment_status === "failed")
          setError(
            "Thanh toán thất bại. Bạn có thể chọn lại QR hoặc thẻ và thử lại.",
          );
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        intent.current = null;
        setUncertain(false);
      }
      setError(e instanceof Error ? e.message : "Chưa xử lý được yêu cầu.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  if (!order)
    return (
      <main className="mx-auto max-w-3xl px-5 pt-32">
        <p role={error ? "alert" : undefined}>
          {error || "Đang tải đơn hàng..."}
        </p>
      </main>
    );
  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-5 pb-16 pt-32">
      <Link className="underline" href="/account?tab=Order%20Tracking">
        ← Tài khoản và đơn hàng
      </Link>
      <div className="my-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="break-all text-2xl font-bold">
          Đơn #{order.order_code}
        </h1>
        <OrderStatus status={order.status} />
      </div>
      <p>
        {user?.name ?? order.customer_name} · {order.customer_phone}
      </p>
      <p>
        {order.pickup_method === "DELIVERY"
          ? order.delivery_address
          : "Nhận tại quầy BrewLite"}
      </p>
      {error && (
        <p role="alert" className="form-error my-4">
          {error}
        </p>
      )}
      {order.message && (
        <p
          role="status"
          className="my-4 rounded-xl bg-amber-50 p-4 text-amber-950"
        >
          {order.message}
        </p>
      )}
      <section className="my-6 rounded-xl border border-[#b79c87] p-5">
        <h2 className="font-bold">Chi tiết món</h2>
        {order.items.map((i) => (
          <div className="border-b py-4" key={i.orderitem_id}>
            <p className="flex justify-between gap-4">
              <span>
                {i.quantity} × {i.product_name} · {i.size}
              </span>
              <strong>{money(i.line_total)}</strong>
            </p>
            <p className="text-sm">
              {i.toppings.map((t) => t.topping_name).join(", ") ||
                "Không topping"}
              {i.note ? ` · ${i.note}` : ""}
            </p>
          </div>
        ))}
        <p className="mt-4">
          Tiền món: {money(order.subtotal)} · Giảm: {money(order.discount)}
        </p>
        <p className="mt-2 text-xl font-bold">Tổng: {money(order.total)}</p>
      </section>
      {(order.actions.can_retry_payment || order.actions.can_resume_payment) &&
        config && (
          <section
            className="my-6 rounded-xl border border-[#b79c87] p-5"
            aria-label="Thanh toán đơn"
          >
            <h2 className="mb-4 font-bold">Thanh toán đơn</h2>
            {order.actions.can_change_method && (
              <>
                {config.provider === "vnpay" ? (
                  <label className="block">
                    Phương thức thanh toán
                    <select
                      aria-label="Phương thức thanh toán"
                      className="ml-3 rounded border p-2"
                      value={channel}
                      disabled={busy || uncertain}
                      onChange={(e) => setChannel(e.target.value)}
                    >
                      <option value="">Chọn tại cổng VNPay</option>
                      <option value="VNPAYQR">VNPay QR (Sandbox)</option>
                      <option value="VNBANK">
                        Thẻ ATM / tài khoản nội địa
                      </option>
                      <option value="INTCARD">Thẻ quốc tế</option>
                    </select>
                  </label>
                ) : (
                  <label>
                    Phương thức mô phỏng{" "}
                    <select
                      className="ml-3 rounded border p-2"
                      aria-label="Phương thức mô phỏng"
                      value={method}
                      disabled={busy || uncertain}
                      onChange={(e) =>
                        setMethod(e.target.value as "momo" | "banking")
                      }
                    >
                      <option value="momo">Ví mô phỏng</option>
                      <option value="banking">Thẻ mô phỏng</option>
                    </select>
                  </label>
                )}
                {config.allow_simulate && (
                  <label className="mt-4 block">
                    Kết quả thanh toán giả lập{" "}
                    <select
                      className="ml-3 rounded border p-2"
                      value={outcome}
                      disabled={busy || uncertain}
                      onChange={(e) =>
                        setOutcome(e.target.value as "SUCCESS" | "FAILED")
                      }
                    >
                      <option value="SUCCESS">Thành công</option>
                      <option value="FAILED">Thất bại</option>
                    </select>
                  </label>
                )}
              </>
            )}
            <p className="mt-3 text-sm">
              {config.provider === "vnpay"
                ? "QR và thông tin thẻ được xử lý tại cổng VNPay Sandbox. BrewLite không thu thập số thẻ/OTP."
                : "Thanh toán mô phỏng cho đồ án; không trừ tiền thật."}
            </p>
            <button
              className="coffee-button mt-4"
              disabled={busy || !config.configured}
              onClick={() => void action("pay")}
            >
              {order.actions.can_resume_payment
                ? "Mở lại phiên thanh toán"
                : "Thanh toán / thử lại"}
            </button>
          </section>
        )}
      {order.actions.can_reconcile && (
        <button
          className="coffee-button mb-5"
          disabled={
            busy ||
            (!!order.payment?.next_check_at &&
              new Date(order.payment.next_check_at).getTime() > now)
          }
          onClick={() => void action("reconcile")}
        >
          Kiểm tra với VNPay
        </button>
      )}
      {order.actions.can_cancel && (
        <section className="my-4 rounded-xl border p-5">
          <h2 className="font-bold">Hủy hoặc đổi món</h2>
          <label className="mt-3 block">
            Lý do hủy
            <input
              className="mt-2 block w-full rounded border p-3"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: muốn đổi sang món khác"
            />
          </label>
          <p className="mt-3 text-sm">
            Đơn chưa thu tiền được hủy sau khi xác nhận kết quả. Đơn đã thu tiền
            cần hoàn xong trước khi tạo đơn thay thế.
          </p>
          <button
            className="coffee-button mt-4"
            disabled={busy}
            onClick={() => void action("cancel")}
          >
            {order.status === "PAID"
              ? "Yêu cầu hủy và hoàn tiền"
              : "Yêu cầu hủy đơn"}
          </button>
        </section>
      )}
      {order.actions.can_replace && (
        <button
          className="coffee-button mt-4"
          onClick={() => {
            if (!user) return;
            useCartStore.getState().bindUser(user.user_id);
            useCartStore.getState().setReplacementOrderId(id, user.user_id);
            router.push("/menu");
          }}
        >
          Chọn món cho đơn thay thế
        </button>
      )}
      <PaymentHistory order={order} />
    </main>
  );
}
