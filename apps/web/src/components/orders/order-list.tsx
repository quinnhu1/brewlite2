"use client";
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
  );
}
