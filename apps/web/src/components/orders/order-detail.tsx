"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ordersApi, type OrderDetail as Detail } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import { authApi, type UserProfile } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "@/store/useCartStore";
import { OrderStatus } from "./order-status";
export default function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const shownConfirmation = useRef(false);
  const [order, setOrder] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const retryKey = useRef("");
  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me()
      .then((u) => {
        if (!controller.signal.aborted) setUser(u);
      })
      .catch(() => {});
    let loading = false;
    async function load() {
      if (loading || controller.signal.aborted) return;
      loading = true;
      try {
        const row = await ordersApi.one(id, controller.signal);
        if (controller.signal.aborted) return;
        setOrder(row);
        if (
          ["PAID", "PREPARING", "READY", "COMPLETED"].includes(row.status) &&
          new URL(window.location.href).searchParams.get("confirmed") === "1" &&
          !shownConfirmation.current
        ) {
          shownConfirmation.current = true;
          setConfirmed(true);
        }
        setError("");
        if (["PAID", "PREPARING", "READY", "COMPLETED"].includes(row.status))
          useCartStore.getState().finishCheckout(id);
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401)
          router.replace(`/signin?next=${encodeURIComponent(`/orders/${id}`)}`);
        else
          setError(
            reason instanceof Error ? reason.message : "Không tải được đơn.",
          );
      } finally {
        loading = false;
      }
    }
    void load();
    const timer = setInterval(() => {
      void load();
    }, 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [id, reload, router]);
  async function action(kind: "cancel" | "retry" | "reconcile") {
    if (!order || busy) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "cancel") {
        await ordersApi.cancel(id);
        if (useCartStore.getState().checkout?.orderId === id)
          useCartStore.getState().setCheckout(null);
      } else if (kind === "reconcile" && order.payment) {
        const result = await paymentsApi.reconcile(order.payment.payment_id);
        if (result.message) setError(result.message);
      } else {
        if (order.payment?.status === "pending" && order.payment.payment_url) {
          const url = new URL(order.payment.payment_url);
          if (
            url.protocol !== "https:" ||
            url.hostname !== "sandbox.vnpayment.vn"
          )
            throw new Error("Đường dẫn VNPay không hợp lệ.");
          window.location.assign(url.toString());
          return;
        }
        retryKey.current ||= crypto.randomUUID();
        const config = await paymentsApi.config();
        const method =
          config.provider === "vnpay"
            ? "vnpay"
            : order.payment?.method === "banking"
              ? "banking"
              : "momo";
        const result = await paymentsApi.create(
          { order_id: id, method },
          retryKey.current,
        );
        if (result.payment_url) {
          const url = new URL(result.payment_url);
          if (
            url.protocol !== "https:" ||
            url.hostname !== "sandbox.vnpayment.vn"
          )
            throw new Error("Đường dẫn VNPay không hợp lệ.");
          window.location.assign(url.toString());
          return;
        }
        if (result.payment_status === "failed") {
          retryKey.current = "";
          throw new Error("Giao dịch thất bại. Bạn có thể thử lại.");
        }
      }
      setReload((n) => n + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa xử lý được yêu cầu.",
      );
    } finally {
      setBusy(false);
    }
  }
  const steps = [
    "Order Confirmed",
    "Preparing",
    order?.pickup_method === "DELIVERY"
      ? "Ready for Delivery"
      : "Ready for Pickup",
    order?.pickup_method === "DELIVERY" ? "Delivered" : "Completed",
  ];
  const currentStep = order
    ? ["PAID", "PREPARING", "READY", "COMPLETED"].indexOf(order.status)
    : -1;
  const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
  return (
    <main className="account-shell">
      <aside className="account-sidebar">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#b79c87] bg-white text-3xl">
            {(user?.name ?? order?.customer_name ?? "U")[0]}
          </span>
          <div>
            <strong>{user?.name ?? order?.customer_name ?? "Member"}</strong>
            <p>point: {user?.point ?? "…"}</p>
            <p className="text-sm">Member</p>
          </div>
        </div>
        <nav>
          <Link
            className="rounded-full px-6 py-4 text-xl font-bold"
            href="/account"
          >
            Account
          </Link>
          <Link
            className="rounded-full bg-[#2b100c] px-6 py-4 text-xl font-bold text-white"
            href="/account?tab=Order%20Tracking"
          >
            Order Tracking
          </Link>
          <Link
            className="rounded-full px-6 py-4 text-xl font-bold"
            href="/account?tab=Order%20History"
          >
            Order History
          </Link>
        </nav>
      </aside>
      <section className="account-content">
        <h2>Order Tracking</h2>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {!order ? (
          <p>Đang tải đơn hàng...</p>
        ) : (
          <>
            <div className="tracking-line">
              {steps.map((step, index) => (
                <div key={step} className={index <= currentStep ? "done" : ""}>
                  <i />
                  {step}
                </div>
              ))}
            </div>
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <strong className="break-all">#{order.order_code}</strong>
              <OrderStatus status={order.status} />
            </div>
            <div className="tracking-details">
              <section>
                <h3>
                  {order.pickup_method === "DELIVERY"
                    ? "Shipping"
                    : "Store Pick-up"}
                </h3>
                <p>
                  {order.pickup_method === "DELIVERY"
                    ? order.delivery_address
                    : "Nhận tại quầy Craft & Grind"}
                </p>
                {order.scheduled_at && (
                  <p className="mt-4">
                    Scheduled:{" "}
                    {new Date(order.scheduled_at).toLocaleString("vi-VN")}
                  </p>
                )}
                <p className="mt-4">{order.customer_name}</p>
                <p>{order.customer_phone}</p>
                {order.order_note && (
                  <p className="mt-4">Note: {order.order_note}</p>
                )}
                <p className="mt-5 text-sm">
                  {currentStep < 0
                    ? "Đơn chưa được xác nhận thanh toán."
                    : currentStep === 0
                      ? "Cửa hàng đã nhận đơn đã thanh toán."
                      : currentStep === 1
                        ? "Đồ uống đang được pha chế."
                        : currentStep === 2
                          ? "Đơn đã sẵn sàng."
                          : "Đơn đã hoàn tất."}
                </p>
              </section>
              <section>
                <h3>Order Details</h3>
                <p className="text-sm">
                  Time: {new Date(order.created_at).toLocaleString("vi-VN")}
                </p>
                <div className="my-5 space-y-4">
                  {order.items.map((i) => (
                    <div key={i.orderitem_id}>
                      <div className="flex justify-between gap-3">
                        <strong>
                          {i.quantity} × {i.product_name}
                        </strong>
                        <span>{money(i.line_total)}</span>
                      </div>
                      <p className="text-xs">
                        size {i.size}, topping{" "}
                        {i.toppings.map((t) => t.topping_name).join(", ") ||
                          "none"}
                      </p>
                      {i.note && <p className="text-xs">{i.note}</p>}
                    </div>
                  ))}
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>{money(order.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Discount</dt>
                    <dd>{money(order.discount)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-3 font-bold">
                    <dt>Payment</dt>
                    <dd>{money(order.total)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm">
                  {order.payment?.method === "vnpay"
                    ? "VNPay Sandbox"
                    : order.payment?.method}{" "}
                  · {order.payment?.status ?? "unpaid"}
                </p>
              </section>
            </div>
            {order.payment?.status === "pending" && (
              <div className="mt-7">
                <p>
                  Đang chờ VNPay xác nhận. Đóng trang thanh toán không xác nhận
                  giao dịch đã hủy.
                </p>
                <button
                  className="coffee-button mt-4"
                  disabled={busy}
                  onClick={() => void action("reconcile")}
                >
                  Kiểm tra với VNPay
                </button>
              </div>
            )}
            {["PENDING", "PAYMENT_FAILED"].includes(order.status) && (
              <div className="mt-7 flex flex-wrap gap-4">
                <button
                  className="coffee-button"
                  disabled={busy}
                  onClick={() => void action("retry")}
                >
                  Tiếp tục thanh toán
                </button>
                <button
                  className="coffee-button"
                  disabled={busy || order.payment?.status === "pending"}
                  onClick={() => void action("cancel")}
                >
                  Hủy đơn chưa trả tiền
                </button>
              </div>
            )}
            {order.status === "PAID" &&
              order.payment &&
              ["mock", "free", "demo"].includes(order.payment.provider) && (
                <button
                  className="coffee-button mt-7"
                  disabled={busy}
                  onClick={() => void action("cancel")}
                >
                  Hủy đơn và hoàn thanh toán giả lập
                </button>
              )}
          </>
        )}
      </section>
      {confirmed && order && (
        <div
          className="checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Successful order"
        >
          <section className="checkout-panel text-center">
            <h2>Successful!</h2>
            <p>Thank you for your order!</p>
            <div className="my-12 space-y-6">
              <p className="rounded-xl border border-[#b79c87] p-4">
                Order ID: <strong>#{order.order_code}</strong>
              </p>
              <p className="rounded-xl border border-[#b79c87] p-4">
                Order status:{" "}
                <strong>
                  {order.status === "PAID" ? "Paid" : order.status}
                </strong>
              </p>
            </div>
            <div className="checkout-actions">
              <button
                onClick={() => {
                  setConfirmed(false);
                  router.replace("/orders/" + id);
                }}
              >
                TRACK ORDER
              </button>
              <Link href="/">BACK TO HOME</Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
