"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { ordersApi, type OrderDetail } from "@/lib/api/orders";
import { OrderStatus } from "./order-status";

const TRACKING_STATUSES = new Set([
  "PENDING",
  "PAYMENT_FAILED",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "PREPARING",
  "READY",
  "SHIPPING",
  "DELIVERING",
]);

/** Customer order history; `tracking` keeps only orders still in flight. */
export default function OrderList({ tracking = false }: { tracking?: boolean }) {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    ordersApi
      .mine()
      .then((result) => {
        if (live) setOrders(result.items);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(
          err instanceof ApiError ? err.message : "Không tải được đơn hàng.",
        );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  if (loading) return <p className="pt-10 text-center">Đang tải đơn hàng...</p>;
  if (error) {
    return (
      <p role="alert" className="pt-10 text-center text-red-500">
        {error}
      </p>
    );
  }

  const visible = tracking
    ? orders.filter((order) => TRACKING_STATUSES.has(order.status))
    : orders;

  if (visible.length === 0) {
    return (
      <p className="pt-10 text-center text-stone-500">
        {tracking ? "Không có đơn nào đang xử lý." : "Chưa có đơn hàng nào."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {visible.map((order) => (
        <li
          key={order.order_id}
          className="rounded-2xl border border-[#e6ddd3] bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong>{order.order_code}</strong>
            <OrderStatus status={order.status} />
          </div>
          <p className="mt-2 text-sm text-stone-500">
            {new Date(order.created_at).toLocaleString("vi-VN")} ·{" "}
            {order.items.length} món
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {order.items.map((item) => (
              <li key={item.orderitem_id}>
                {item.quantity} × {item.product_name} ({item.size})
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right font-semibold">
            {order.total.toLocaleString("vi-VN")}₫
          </p>
        </li>
      ))}
    </ul>
  );
}
