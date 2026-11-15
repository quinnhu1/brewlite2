<<<<<<< HEAD:apps/web/src/components/orders/order-status.tsx
export const statusLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAYMENT_FAILED: "Thanh toán thất bại",
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha chế",
  READY: "Sẵn sàng nhận",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  DELIVERING: "Đang giao",
};
export function OrderStatus({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${["CANCELLED", "PAYMENT_FAILED"].includes(status) ? "bg-red-50 text-red-800" : "bg-[#e9dfd4] text-[#513421]"}`}
    >
      {statusLabels[status] ?? status}
=======
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-900 ring-amber-300",
  },
  PAYMENT_FAILED: {
    label: "Payment failed",
    className: "bg-rose-100 text-rose-900 ring-rose-300",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-sky-100 text-sky-900 ring-sky-300",
  },
  PREPARING: {
    label: "Preparing",
    className: "bg-sky-100 text-sky-900 ring-sky-300",
  },
  READY: {
    label: "Ready",
    className: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  },
  SHIPPING: {
    label: "Shipping",
    className: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  },
  DELIVERING: {
    label: "Delivering",
    className: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-stone-200 text-stone-800 ring-stone-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-900 ring-red-300",
  },
};

/** Badge for an order status; unknown values fall back to the raw label. */
export function OrderStatus({ status }: { status: string }) {
  const key = status?.toUpperCase() ?? "";
  const style = STATUS_STYLES[key] ?? {
    label: key || "Unknown",
    className: "bg-stone-100 text-stone-700 ring-stone-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${style.className}`}
    >
      {style.label}
>>>>>>> origin/main:app/web/src/components/orders/order-status.tsx
    </span>
  );
}
