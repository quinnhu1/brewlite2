"use client";
<<<<<<< HEAD:apps/web/src/components/orders/order-list.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, type OrderPage, type OrderDetail } from "@/lib/api/orders";
import { fetchProductById } from "@/lib/api/products";
import { useCartStore } from "@/store/useCartStore";
import { ApiError } from "@/lib/api/client";
import { OrderStatus } from "./order-status";
export default function OrderList({ tracking }: { tracking: boolean }) {
  const router = useRouter();
  const [page, setPage] = useState(1),
    [data, setData] = useState<OrderPage | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    const c = new AbortController();
    async function load() {
      try {
        const r = await ordersApi.mine(page, c.signal);
        if (!c.signal.aborted) {
          setData(r);
          setError("");
        }
      } catch (e) {
        if (c.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401)
          router.replace("/signin?next=%2Faccount");
        else setError(e instanceof Error ? e.message : "Không tải được đơn.");
      }
    }
    void load();
    const timer = tracking ? setInterval(() => void load(), 10000) : null;
    return () => {
      c.abort();
      if (timer) clearInterval(timer);
    };
  }, [page, tracking, router]);
  async function reorder(order: OrderDetail) {
    setBusy(order.order_id);
    setError("");
    try {
      const products = await Promise.all(
        order.items.map((i) => fetchProductById(i.product_id)),
      );
      const payloads = order.items.map((i, index) => {
        const p = products[index],
          sz = p.product_size.find((s) => s.size === i.size);
        if (!sz || p.stock < i.quantity)
          throw new Error(
            `${i.product_name}: size hoặc tồn kho đã thay đổi, hãy chọn lại tại Menu.`,
          );
        const toppings = i.toppings.map((t) => {
          const found = p.toppings.find((x) => x.topping_id === t.topping_id);
          if (!found)
            throw new Error(
              `Topping của ${i.product_name} đã thay đổi, hãy chọn lại tại Menu.`,
            );
          return { ...found, price: Number(found.price), is_active: true };
        });
        return {
          product_id: p.productId,
          product_name: p.productName,
          image_url: p.imageUrl ?? "/images/espresso.jpg",
          base_price: Number(p.basePrice),
          size: i.size as "S" | "M" | "L",
          add_price: Number(sz.add_price),
          toppings,
          quantity: i.quantity,
          stock: p.stock,
          note: i.note ?? undefined,
        };
      });
      for (const p of payloads) useCartStore.getState().addItem(p);
      router.push("/cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đặt lại được.");
    } finally {
      setBusy("");
    }
  }
  const current = data?.page === page ? data : null,
    rows =
      current?.items.filter(
        (o) => !tracking || !["CANCELLED", "COMPLETED"].includes(o.status),
      ) ?? [];
  return (
    <div>
      <h2>{tracking ? "Order Tracking" : "History"}</h2>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!current && !error && <p>Đang tải đơn hàng...</p>}
      {current && rows.length === 0 && (
        <p>{tracking ? "Chưa có đơn đang xử lý." : "Bạn chưa có đơn hàng."}</p>
      )}
      {rows.map((o) => (
        <article className="order-card" key={o.order_id}>
          <div className="order-card-head">
            <Link href={"/orders/" + o.order_id}>
              <strong>ID: #{o.order_code}</strong>
            </Link>
            <span className="text-sm">
              {new Date(o.created_at).toLocaleString("vi-VN")}
            </span>
          </div>
          <Link href={"/orders/" + o.order_id}>
            <p>
              {o.items
                .map(
                  (i) => `${i.quantity} × ${i.product_name} (size ${i.size})`,
                )
                .join(", ")}
            </p>
            <div className="mt-3">
              <OrderStatus status={o.status} />
            </div>
          </Link>
          <div className="order-card-bottom">
            <strong>total: {o.total.toLocaleString("vi-VN")}đ</strong>
            {tracking ? (
              <Link
                className="rounded-full border border-[#b79c87] px-4 py-1 text-sm"
                href={"/orders/" + o.order_id}
              >
                Track order
              </Link>
            ) : (
              <button
                className="rounded-full border border-[#b79c87] px-4 py-1 text-sm"
                disabled={!!busy}
                onClick={() => void reorder(o)}
              >
                {busy === o.order_id ? "Loading..." : "Re-order"}
              </button>
            )}
          </div>
        </article>
      ))}
      {current && current.total > current.page_size && (
        <div className="mt-6 flex justify-between">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>{page}</span>
          <button
            disabled={page * current.page_size >= current.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
=======

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
>>>>>>> origin/main:app/web/src/components/orders/order-list.tsx
  );
}
