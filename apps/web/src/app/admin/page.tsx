"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authApi, type UserProfile } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  adminApi,
  ADMIN_CATEGORIES,
  type AdminProduct,
  type ProductBody,
  type AdminOrder,
} from "@/lib/api/admin";
import type { OrderDetail } from "@/lib/api/orders";
import { OrderStatus } from "@/components/orders/order-status";
import { getProductImageUrl } from "@/data/categories";
const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null),
    [tab, setTab] = useState("Products"),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    authApi
      .me()
      .then((u) => {
        if (live) {
          if (u.role !== "admin")
            setError("Tài khoản này không có quyền quản trị.");
          else setUser(u);
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401)
          router.replace("/signin?next=%2Fadmin");
        else if (live)
          setError(
            e instanceof Error ? e.message : "Không tải được tài khoản.",
          );
      });
    return () => {
      live = false;
    };
  }, [router]);
  if (!user)
    return (
      <main className="pt-40 text-center">
        <p role={error ? "alert" : undefined}>
          {error || "Đang xác thực quyền quản trị..."}
        </p>
        {error && (
          <Link className="mt-6 block underline" href="/account">
            Về tài khoản
          </Link>
        )}
      </main>
    );
  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link className="brand" href="/">
          <strong>Craft &amp; Grind</strong>
          <span>Every cup tells the story of the bean</span>
        </Link>
        <h1>ADMIN PORTAL</h1>
        <div className="text-right">
          <span>ADMIN: {user.name}</span>
          <button
            className="ml-5 text-sm underline"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              router.push("/signin");
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="admin-shell">
        <aside className="admin-sidebar">
          {["Products", "Order Tracking", "Order History"].map((t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </aside>
        <section className="admin-content">
          {tab === "Products" ? (
            <Products />
          ) : (
            <Orders key={tab} tracking={tab === "Order Tracking"} />
          )}
        </section>
      </main>
    </div>
  );
}
function Products() {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [data, setData] = useState<{ items: AdminProduct[]; total: number } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<AdminProduct | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    adminApi
      .products(q, category, page, active)
      .then((r) => {
        if (live) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [q, category, page, active, reload]);
  return (
    <>
      <div className="admin-toolbar">
        <button className="add-product" onClick={() => setEditor(null)}>
          + add product
        </button>
        <label>
          search:{" "}
          <input
            aria-label="Search products"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Product name"
          />
        </label>
        <label>
          filter:{" "}
          <select
            aria-label="Category filter"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {ADMIN_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <select
          aria-label="Active filter"
          value={active}
          onChange={(e) => {
            setActive(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {["Image", "Name", "Category", "Price", "Stock", "Action"].map(
                (x) => (
                  <th key={x}>{x}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={6}>Loading products...</td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={6}>No products found.</td>
              </tr>
            ) : (
              data.items.map((p) => (
                <tr key={p.productId}>
                  <td>
                    <Image
                      src={getProductImageUrl(p.imageUrl)}
                      alt={p.productName}
                      width={64}
                      height={64}
                      className="mx-auto h-16 w-16 object-contain"
                    />
                  </td>
                  <td>{p.productName}</td>
                  <td>{p.categories}</td>
                  <td>{money(p.basePrice)}</td>
                  <td>
                    {p.stock}
                    <br />
                    <small>[{p.isActive ? "active" : "inactive"}]</small>
                  </td>
                  <td>
                    <button
                      className="underline"
                      aria-label={"Edit " + p.productName}
                      onClick={() => setEditor(p)}
                    >
                      edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} total={data.total} change={setPage} />}
      {editor !== undefined && (
        <ProductEditor
          product={editor}
          close={() => setEditor(undefined)}
          saved={() => {
            setEditor(undefined);
            setReload((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
function ProductEditor({
  product,
  close,
  saved,
}: {
  product: AdminProduct | null;
  close: () => void;
  saved: () => void;
}) {
  const [body, setBody] = useState<ProductBody>(() => ({
    productName: product?.productName ?? "",
    description: product?.description ?? "",
    basePrice: product?.basePrice ?? 30000,
    imageUrl: product?.imageUrl ?? "/images/espresso.jpg",
    categories: product?.categories ?? "Classic Coffee",
    stock: product?.stock ?? 50,
    isActive: product?.isActive ?? true,
    sizes: product?.sizes ?? [
      { size: "S", addPrice: 0 },
      { size: "M", addPrice: 5000 },
      { size: "L", addPrice: 10000 },
    ],
    toppingIds: product?.toppingIds ?? [],
    ...(product ? { version: product.version } : {}),
  }));
  const [tops, setTops] = useState<
      { topping_id: string; topping_name: string; price: string | number }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    adminApi
      .toppings()
      .then((t) => {
        if (live) setTops(t);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi.save(
        {
          ...body,
          sizes:
            body.categories === "Pastry & Dessert"
              ? body.sizes.filter((s) => s.size === "S")
              : body.sizes,
        },
        product?.productId,
      );
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="checkout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-editor-title"
    >
      <form className="product-editor" onSubmit={save}>
        <div className="flex items-center justify-between gap-5">
          <h2 id="product-editor-title">
            {product ? "Edit product" : "Add product"}
          </h2>
          <button
            aria-label="Close editor"
            type="button"
            onClick={close}
            disabled={busy}
          >
            ✕
          </button>
        </div>
        <div className="editor-grid">
          <label>
            Name
            <input
              required
              maxLength={50}
              value={body.productName}
              onChange={(e) =>
                setBody({ ...body, productName: e.target.value })
              }
            />
          </label>
          <label>
            Category
            <select
              value={body.categories}
              onChange={(e) => {
                const category = e.target.value;
                setBody({
                  ...body,
                  categories: category,
                  sizes:
                    category === "Pastry & Dessert"
                      ? [{ size: "S", addPrice: 0 }]
                      : ["S", "M", "L"].map((s, i) => ({
                          size: s as "S" | "M" | "L",
                          addPrice:
                            body.sizes.find((x) => x.size === s)?.addPrice ??
                            i * 5000,
                        })),
                });
              }}
            >
              {ADMIN_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Price (VND)
            <input
              required
              type="number"
              min={0}
              max={9999999999}
              step={1}
              value={body.basePrice}
              onChange={(e) =>
                setBody({ ...body, basePrice: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Available stock
            <input
              required
              type="number"
              min={0}
              max={1000000}
              step={1}
              value={body.stock}
              onChange={(e) =>
                setBody({ ...body, stock: Number(e.target.value) })
              }
            />
          </label>
          <label className="col-span-full">
            Image path
            <input
              required
              value={body.imageUrl}
              maxLength={1000}
              onChange={(e) => setBody({ ...body, imageUrl: e.target.value })}
            />
          </label>
          <label className="col-span-full">
            Description
            <textarea
              value={body.description}
              maxLength={2000}
              onChange={(e) =>
                setBody({ ...body, description: e.target.value })
              }
            />
          </label>
        </div>
        <fieldset>
          <legend>Size / additional price (VND)</legend>
          <div className="editor-sizes">
            {body.sizes.map((s) => (
              <label key={s.size}>
                {body.categories === "Pastry & Dessert"
                  ? "Standard portion"
                  : s.size}
                <input
                  type="number"
                  required
                  min={0}
                  max={99999}
                  step={1}
                  value={s.addPrice}
                  onChange={(e) =>
                    setBody({
                      ...body,
                      sizes: body.sizes.map((x) =>
                        x.size === s.size
                          ? { ...x, addPrice: Number(e.target.value) }
                          : x,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Compatible toppings</legend>
          <div className="editor-toppings">
            {tops.map((t) => (
              <label key={t.topping_id}>
                <input
                  type="checkbox"
                  checked={body.toppingIds.includes(t.topping_id)}
                  onChange={(e) =>
                    setBody({
                      ...body,
                      toppingIds: e.target.checked
                        ? [...body.toppingIds, t.topping_id]
                        : body.toppingIds.filter((x) => x !== t.topping_id),
                    })
                  }
                />
                {t.topping_name}{" "}
                <small>+{Number(t.price).toLocaleString("vi-VN")}</small>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="my-5 flex items-center gap-3">
          <input
            type="checkbox"
            checked={body.isActive}
            onChange={(e) => setBody({ ...body, isActive: e.target.checked })}
          />{" "}
          Active (bỏ chọn để ngừng bán; giữ lịch sử đơn)
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="checkout-actions">
          <button type="button" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save product"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Orders({ tracking }: { tracking: boolean }) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [data, setData] = useState<{ items: AdminOrder[]; total: number } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [detail, setDetail] = useState<OrderDetail | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    adminApi
      .orders(tracking ? "tracking" : "history", q, status, page)
      .then((r) => {
        if (live) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [tracking, q, status, page, reload]);
  useEffect(() => {
    if (!tracking) return;
    const timer = setInterval(() => setReload((n) => n + 1), 10000);
    return () => clearInterval(timer);
  }, [tracking]);
  async function open(id: string) {
    try {
      setDetail(await adminApi.order(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn.");
    }
  }
  async function advance(o: Pick<AdminOrder, "order_id" | "status">) {
    const next = (
      { PAID: "preparing", PREPARING: "ready", READY: "completed" } as Record<
        string,
        string
      >
    )[o.status];
    if (!next) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.advance(o.order_id, next);
      setReload((n) => n + 1);
      if (detail?.order_id === o.order_id)
        setDetail(await adminApi.order(o.order_id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2 className="mb-7 text-2xl font-bold">
        {tracking ? "Order Tracking" : "Order History"}
      </h2>
      <div className="admin-toolbar">
        <label>
          search:{" "}
          <input
            aria-label="Search orders"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Code / name / phone"
          />
        </label>
        <select
          aria-label="Order status filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {(tracking
            ? ["pending", "payment_failed", "paid", "preparing", "ready"]
            : [
                "pending",
                "payment_failed",
                "paid",
                "preparing",
                "ready",
                "completed",
                "cancelled",
              ]
          ).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="underline" onClick={() => setReload((n) => n + 1)}>
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table orders-table">
          <thead>
            <tr>
              {["Order", "Customer", "Items", "Total", "Status", "Action"].map(
                (x) => (
                  <th key={x}>{x}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={6}>Loading orders...</td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={6}>No orders found.</td>
              </tr>
            ) : (
              data.items.map((o) => (
                <tr key={o.order_id}>
                  <td>
                    <button
                      className="underline"
                      onClick={() => void open(o.order_id)}
                    >
                      #{o.order_code}
                    </button>
                    <small className="mt-2 block">
                      {new Date(o.created_at).toLocaleString("vi-VN")}
                    </small>
                  </td>
                  <td>
                    {o.customer_name}
                    <small className="block">{o.customer_phone}</small>
                  </td>
                  <td>
                    {o.items
                      .map(
                        (i) => `${i.quantity} × ${i.product_name} (${i.size})`,
                      )
                      .join(", ")}
                  </td>
                  <td>{money(o.total)}</td>
                  <td>
                    <OrderStatus status={o.status} />
                    <small className="mt-2 block">
                      {o.payment?.status ?? "unpaid"}
                    </small>
                  </td>
                  <td>
                    <button
                      className="underline"
                      onClick={() => void open(o.order_id)}
                    >
                      Details
                    </button>
                    {tracking &&
                      ["PAID", "PREPARING", "READY"].includes(o.status) && (
                        <button
                          className="mt-3 rounded-full bg-[#715039] px-4 py-2 text-sm text-white"
                          disabled={busy}
                          onClick={() => void advance(o)}
                        >
                          {
                            (
                              {
                                PAID: "Start preparing",
                                PREPARING: "Mark ready",
                                READY: "Complete",
                              } as Record<string, string>
                            )[o.status]
                          }
                        </button>
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={page} total={data.total} change={setPage} />}
      {detail && (
        <div
          className="checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
        >
          <section className="product-editor">
            <div className="flex justify-between gap-5">
              <h2>#{detail.order_code}</h2>
              <button
                onClick={() => setDetail(null)}
                aria-label="Close order details"
              >
                ✕
              </button>
            </div>
            <div className="my-5">
              <OrderStatus status={detail.status} />
            </div>
            <p>
              {detail.customer_name} · {detail.customer_phone}
            </p>
            <p>
              {detail.pickup_method === "DELIVERY" ? "Delivery" : "Pick up"} ·{" "}
              {detail.delivery_address}
            </p>
            {detail.order_note && <p>Note: {detail.order_note}</p>}
            <div className="my-6 divide-y">
              {detail.items.map((i) => (
                <p className="py-3" key={i.orderitem_id}>
                  {i.quantity} × {i.product_name} ({i.size}) ·{" "}
                  {i.toppings.map((t) => t.topping_name).join(", ") ||
                    "no topping"}{" "}
                  <strong className="float-right">{money(i.line_total)}</strong>
                </p>
              ))}
            </div>
            <p>Subtotal: {money(detail.subtotal)}</p>
            <p>Discount: {money(detail.discount)}</p>
            <p className="mt-3 font-bold">Total: {money(detail.total)}</p>
            <p className="mt-3">
              Payment: {detail.payment?.status ?? "unpaid"} ·{" "}
              {detail.payment?.method}
            </p>
            {["PAID", "PREPARING", "READY"].includes(detail.status) && (
              <button
                className="coffee-button mt-7"
                disabled={busy}
                onClick={() => void advance(detail)}
              >
                {
                  (
                    {
                      PAID: "Start preparing",
                      PREPARING: "Mark ready",
                      READY: "Complete",
                    } as Record<string, string>
                  )[detail.status]
                }
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function Pager({
  page,
  total,
  change,
}: {
  page: number;
  total: number;
  change: (p: number) => void;
}) {
  return (
    <div className="admin-pager">
      <button disabled={page <= 1} onClick={() => change(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} · {total} records
      </span>
      <button disabled={page * 20 >= total} onClick={() => change(page + 1)}>
        Next
      </button>
    </div>
  );
}
