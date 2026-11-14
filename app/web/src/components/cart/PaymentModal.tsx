"use client";

import React, { useState } from "react";
import { useCartStore } from "../../store/useCartStore";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discount: number;
  total: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  subtotal,
  discount,
  total,
}: PaymentModalProps) {
  const {
    activeOrderId,
    paymentKey,
    paymentBody,
    orderActions,
    ensureCheckoutKey,
    ensurePaymentKey,
    setPaymentAttempt,
    syncCheckoutWithOrder,
  } = useCartStore();

  const [method, setMethod] = useState<"E_WALLET" | "CARD">("E_WALLET");
  const [simulateResult, setSimulateResult] = useState<"SUCCESS" | "FAILED" | "PENDING">("SUCCESS");
  const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "PAID" | "PAYMENT_FAILED" | "PENDING_RECONCILE">("IDLE");
  const [stockError, setStockError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string>(activeOrderId ?? "ORD-2026-8899");

  if (!isOpen) return null;

  const canChangeMethod =
    status !== "PROCESSING" &&
    status !== "PENDING_RECONCILE" &&
    (orderActions?.can_change_method ?? paymentBody === null);

  const handleConfirmPayment = () => {
    if (status === "PROCESSING") return;
    setStockError(null);
    setStatus("PROCESSING");

    const currentOrderId = activeOrderId ?? `ORD-${Date.now().toString().slice(-6)}`;
    setOrderCode(currentOrderId);
    ensureCheckoutKey();
    const currentPayKey = ensurePaymentKey();

    const requestBody = paymentBody ?? {
      order_id: currentOrderId,
      provider: "mock",
      method,
      idempotency_key: currentPayKey,
    };

    setPaymentAttempt(currentOrderId, requestBody);

    setTimeout(() => {
      if (simulateResult === "SUCCESS") {
        setStatus("PAID");
        syncCheckoutWithOrder({
          order_id: currentOrderId,
          status: "PAID",
          payment_status: "PAID",
          actions: {
            can_cancel: true,
            can_retry_payment: false,
            can_change_method: false,
          },
        });
      } else if (simulateResult === "FAILED") {
        setStatus("PAYMENT_FAILED");
        syncCheckoutWithOrder({
          order_id: currentOrderId,
          status: "PAYMENT_FAILED",
          payment_status: "FAILED",
          actions: {
            can_cancel: true,
            can_retry_payment: true,
            can_change_method: true,
          },
        });
      } else {
        setStatus("PENDING_RECONCILE");
        syncCheckoutWithOrder({
          order_id: currentOrderId,
          status: "PENDING",
          payment_status: "PENDING",
          actions: {
            can_cancel: false,
            can_retry_payment: false,
            can_change_method: false,
            reason: "Giao dịch đang chờ đối soát với cổng thanh toán.",
          },
        });
      }
    }, 600);
  };

  const handleReconcile = () => {
    setStatus("PAYMENT_FAILED");
    syncCheckoutWithOrder({
      order_id: orderCode,
      status: "PAYMENT_FAILED",
      payment_status: "FAILED",
      actions: {
        can_cancel: true,
        can_retry_payment: true,
        can_change_method: true,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Thanh toán Không tiền mặt — BrewLite
            </h2>
            <p className="text-xs text-amber-700">
              Thanh toán mô phỏng cho đồ án, không trừ tiền thật
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Đóng
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
            <div>Mã đơn: <span className="font-semibold text-stone-900">{orderCode}</span></div>
            <div>Idempotency-Key: <code className="text-amber-800">{paymentKey ?? "Sẵn sàng sinh khi bấm"}</code></div>
          </div>

          {stockError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {stockError}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Chọn phương thức thanh toán {!canChangeMethod && "(Đang khóa do giao dịch chờ đối soát)"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canChangeMethod}
                onClick={() => setMethod("E_WALLET")}
                className={`rounded-xl border p-3 text-left text-sm font-medium transition ${
                  method === "E_WALLET"
                    ? "border-amber-700 bg-amber-50 text-amber-900"
                    : "border-stone-200 text-stone-700"
                } ${!canChangeMethod ? "cursor-not-allowed opacity-50" : ""}`}
              >
                QR Ví Điện Tử (MoMo / VNPay)
              </button>
              <button
                type="button"
                disabled={!canChangeMethod}
                onClick={() => setMethod("CARD")}
                className={`rounded-xl border p-3 text-left text-sm font-medium transition ${
                  method === "CARD"
                    ? "border-amber-700 bg-amber-50 text-amber-900"
                    : "border-stone-200 text-stone-700"
                } ${!canChangeMethod ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Thẻ Ngân Hàng (NCB / Nội địa)
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-stone-300 p-3">
            <p className="mb-2 text-xs font-semibold text-stone-600">
              Chế độ mô phỏng kết quả (Demo):
            </p>
            <div className="flex gap-2 text-xs">
              {(["SUCCESS", "FAILED", "PENDING"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSimulateResult(mode)}
                  className={`rounded-lg px-3 py-1.5 font-medium ${
                    simulateResult === mode
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {mode === "SUCCESS"
                    ? "Thành công (PAID)"
                    : mode === "FAILED"
                    ? "Lỗi (PAYMENT_FAILED)"
                    : "Treo / Đối soát"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Tạm tính:</span>
              <span>{subtotal.toLocaleString("vi-VN")}đ</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Giảm giá:</span>
              <span>-{discount.toLocaleString("vi-VN")}đ</span>
            </div>
            <div className="flex justify-between text-base font-bold text-stone-900">
              <span>Tổng thanh toán:</span>
              <span>{total.toLocaleString("vi-VN")}đ</span>
            </div>
          </div>

          {status === "PAID" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-bold">Thanh toán thành công (PAID)!</p>
              <p className="mt-1">
                Mã đơn <strong>{orderCode}</strong> đã chuyển xuống quầy Barista. Đã cộng{" "}
                <strong>+{Math.floor(total / 10000)} điểm</strong> thưởng.
              </p>
            </div>
          )}

          {status === "PAYMENT_FAILED" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-bold">Giao dịch thất bại cuối cùng (PAYMENT_FAILED)</p>
              <p className="mt-1">
                Giỏ hàng và đơn <strong>{orderCode}</strong> vẫn được giữ nguyên. Đã mở khóa để bạn đổi giữa Ví và Thẻ hoặc thử thanh toán lại bằng Idempotency-Key mới.
              </p>
            </div>
          )}

          {status === "PENDING_RECONCILE" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Giao dịch đang chờ đối soát kết quả</p>
              <p className="mt-1">
                Hệ thống chưa nhận được phản hồi cuối từ cổng thanh toán. Không tự động trừ tiền lặp.
              </p>
              <button
                type="button"
                onClick={handleReconcile}
                className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Kiểm tra trạng thái (Reconcile)
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700"
            >
              Đóng
            </button>
            {status !== "PAID" && (
              <button
                type="button"
                disabled={status === "PROCESSING" || status === "PENDING_RECONCILE"}
                onClick={handleConfirmPayment}
                className="rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
              >
                {status === "PAYMENT_FAILED"
                  ? "Thử thanh toán lại (Key mới)"
                  : status === "PROCESSING"
                  ? "Đang xử lý..."
                  : "Xác nhận trả"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}