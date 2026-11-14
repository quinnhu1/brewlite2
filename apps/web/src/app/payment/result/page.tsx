"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "../../../store/useCartStore";

export default function PaymentResultPage() {
  const { activeOrderId, syncCheckoutWithOrder } = useCartStore();
  const [viewStatus, setViewStatus] = useState<"PAID" | "PAYMENT_FAILED" | "PENDING">("PAID");
  const orderId = activeOrderId ?? "ORD-2026-8899";

  useEffect(() => {
    syncCheckoutWithOrder({
      order_id: orderId,
      status: viewStatus,
      payment_status: viewStatus === "PAID" ? "PAID" : viewStatus === "PAYMENT_FAILED" ? "FAILED" : "PENDING",
    });
  }, [orderId, viewStatus, syncCheckoutWithOrder]);

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h1 className="text-lg font-bold text-stone-900">
            Kết quả Giao dịch — BrewLite
          </h1>
          <div className="flex gap-1 text-xs">
            {(["PAID", "PAYMENT_FAILED", "PENDING"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setViewStatus(st)}
                className={`rounded-lg px-2.5 py-1 font-medium ${
                  viewStatus === st
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {viewStatus === "PAID" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <h2 className="text-base font-bold">Thanh toán thành công (PAID)</h2>
            <p className="mt-1">
              Đơn hàng <strong>{orderId}</strong> đã được xác nhận và chuyển sang quầy pha chế. Các món đã mua đã được dọn khỏi giỏ hàng.
            </p>
          </div>
        )}

        {viewStatus === "PAYMENT_FAILED" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <h2 className="text-base font-bold">Thanh toán thất bại (PAYMENT_FAILED)</h2>
            <p className="mt-1">
              Hệ thống đã xóa <code>paymentBody</code> cũ và sinh <code>paymentKey</code> mới. Bạn có thể quay lại giỏ hàng để đổi phương thức (Ví / Thẻ) hoặc thử lại trên cùng đơn hàng <strong>{orderId}</strong>.
            </p>
          </div>
        )}

        {viewStatus === "PENDING" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <h2 className="text-base font-bold">Đang chờ đối soát (PENDING)</h2>
            <p className="mt-1">
              Giao dịch trên đơn <strong>{orderId}</strong> đang được đối soát với cổng thanh toán (QueryDR / IPN). Hệ thống tạm khóa đổi kênh để tránh trừ tiền hai lần.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/cart"
            className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
          >
            Quay về Giỏ hàng
          </Link>
        </div>
      </div>
    </main>
  );
}