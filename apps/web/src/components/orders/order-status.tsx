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
    </span>
  );
}
