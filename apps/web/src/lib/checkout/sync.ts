import type { OrderDetail } from "@/lib/api/orders";
import { useCartStore } from "@/store/useCartStore";

/** Only synchronize an order fetched through the authenticated owner API. */
export function syncCheckoutWithOrder(order: OrderDetail) {
  const state = useCartStore.getState();
  if (state.checkout?.orderId !== order.order_id) return;
  if (["PAID", "PREPARING", "READY", "COMPLETED"].includes(order.status)) {
    state.finishCheckout(order.order_id);
  } else if (order.status === "CANCELLED") {
    state.setCheckout(null);
  } else if (
    order.payment?.status === "failed" &&
    state.checkout.paymentBody &&
    (state.checkout.paymentKey === order.payment.idempotency_key ||
      order.actions.can_retry_payment)
  ) {
    state.setCheckout({
      ...state.checkout,
      paymentKey: crypto.randomUUID(),
      paymentBody: undefined,
    });
  }
}

export function openVnpay(paymentUrl: string) {
  const url = new URL(paymentUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "sandbox.vnpayment.vn" ||
    url.username ||
    url.password
  )
    throw new Error("Đường dẫn VNPay không hợp lệ.");
  window.location.assign(url.toString());
}
