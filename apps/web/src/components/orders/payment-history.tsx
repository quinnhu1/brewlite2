import type { OrderDetail } from "@/lib/api/orders";
const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
const labels: Record<string, string> = {
  requested: "Đã yêu cầu hoàn",
  processing: "Đang xử lý hoàn",
  succeeded: "Hoàn tiền được xác nhận",
  failed: "Yêu cầu hoàn bị từ chối",
  review_required: "Cần đối soát",
  pending: "Chờ xác nhận",
  success: "Đã thanh toán",
  refunded: "Đã hoàn",
};
export default function PaymentHistory({ order }: { order: OrderDetail }) {
  return (
    <section
      className="mt-7 rounded-xl border border-[#b79c87] p-5"
      aria-label="Lịch sử thanh toán và hoàn tiền"
    >
      <h3 className="font-bold">Lịch sử thanh toán và hoàn tiền</h3>
      {order.cancellation_requested_at && (
        <p className="mt-3">
          Yêu cầu hủy:{" "}
          {new Date(order.cancellation_requested_at).toLocaleString("vi-VN")} ·{" "}
          {order.cancellation_reason}
        </p>
      )}
      {order.replacement_of_order_id && (
        <p className="mt-3 break-all">
          Đơn thay thế cho: {order.replacement_of_order_id}
        </p>
      )}
      <ul className="mt-4 space-y-4">
        {order.payment_attempts.map((p) => (
          <li key={p.payment_id} className="border-t pt-3 text-sm">
            <p>
              {p.status === "failed"
                ? "Thanh toán thất bại"
                : (labels[p.status] ?? p.status)}{" "}
              · {money(p.amount)} ·{" "}
              {p.provider === "mock" ? "Mô phỏng" : p.provider} ·{" "}
              {p.bank_code ?? p.method}
            </p>
            <p className="break-all">
              Mã giao dịch: {p.transaction_id ?? p.payment_id}
            </p>
            {p.response_code && <p>Mã phản hồi: {p.response_code}</p>}
            {p.reconciliation_note && <p>{p.reconciliation_note}</p>}
            {p.status === "pending" && p.next_check_at && (
              <p>
                Kiểm tra tiếp theo:{" "}
                {new Date(p.next_check_at).toLocaleString("vi-VN")}
              </p>
            )}
          </li>
        ))}
      </ul>
      {order.refunds.map((r) => (
        <article
          key={r.refund_id}
          className="mt-4 rounded-lg bg-[#f4eee8] p-4 text-sm"
          data-testid="refund-receipt"
        >
          <strong>
            {labels[r.status]} · {money(r.amount)}
          </strong>
          <p className="break-all">Chứng từ: {r.refund_id}</p>
          <p>Lý do: {r.reason}</p>
          <p>{r.message}</p>
          {r.provider !== "vnpay" && (
            <p>Hoàn tiền mô phỏng; không chuyển tiền ngân hàng.</p>
          )}
          {r.completed_at && (
            <p>Hoàn tất: {new Date(r.completed_at).toLocaleString("vi-VN")}</p>
          )}
          {r.provider_ref && (
            <p className="break-all">Tham chiếu: {r.provider_ref}</p>
          )}
        </article>
      ))}
    </section>
  );
}
