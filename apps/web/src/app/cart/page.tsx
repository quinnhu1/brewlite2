"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PaymentModal, {
  type OrderConfirmationResult,
} from "@/components/cart/PaymentModal";
import { useCartStore } from "@/store/useCartStore";
import { fetchProductById } from "@/lib/api/products";
import { getProductImageUrl } from "@/data/categories";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default function CartPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const pickupMethod = useCartStore((state) => state.pickupMethod);
  const promotionCode = useCartStore((state) => state.promotionCode);
  const setPromotionCode = useCartStore((state) => state.setPromotionCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const toggleSelectAll = useCartStore((state) => state.toggleSelectAll);
  const setPickupMethod = useCartStore((state) => state.setPickupMethod);

  const badgeCount = useCartStore((state) => state.getTotalBadgeCount());
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderConfirmationResult | null>(
    null,
  );

  // In this Figma flow every visible cart row is included in checkout; selection is enabled together at checkout.
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const discount = 0;
  const total = Math.max(0, subtotal - discount);

  const handlePaymentSuccess = (result: OrderConfirmationResult) => {
    setLastOrder(result);
  };

  const productIds = [...new Set(items.map((i) => i.product_id))]
    .sort()
    .join(",");
  useEffect(() => {
    if (!productIds) return;
    const controller = new AbortController();
    Promise.all(
      productIds
        .split(",")
        .map((id) => fetchProductById(id, controller.signal)),
    )
      .then((products) => useCartStore.getState().refreshProducts(products))
      .catch(() => {
        /* Checkout verifies availability and prices again on the server. */
      });
    return () => controller.abort();
  }, [productIds]);

  const openPayment = () => {
    if (!localStorage.getItem("token")) {
      router.push("/signin?next=%2Fcart");
      return;
    }
    toggleSelectAll(true);
    setIsPaymentOpen(true);
  };

  if (!hydrated)
    return (
      <main className="min-h-[65vh] pt-32 text-center">
        Đang tải giỏ hàng...
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f2ebe4] px-5 pb-20 pt-[132px] text-[#2b100c] md:px-10">
      <div className="mx-auto max-w-[1150px]">
        {lastOrder && (
          <div
            role="status"
            className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-[#bda18d] pb-4 text-sm"
          >
            <p>
              Successful order <strong>#{lastOrder.order_code}</strong> · Paid
            </p>
            <button
              type="button"
              onClick={() => setLastOrder(null)}
              className="underline underline-offset-4"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-[78px]">
          <section aria-labelledby="cart-title">
            <div className="mb-10 flex items-end justify-between gap-4">
              <h1
                id="cart-title"
                className="text-[30px] font-bold tracking-tight"
              >
                My cart
              </h1>
              <span className="pb-1 text-sm text-[#806b5e]">
                {badgeCount} item{badgeCount === 1 ? "" : "s"}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-[18px] border border-[#bda18d] bg-white/60 px-6 py-16 text-center">
                <h2 className="text-xl font-semibold">Your cart is empty</h2>
                <p className="mt-2 text-sm text-[#806b5e]">
                  Choose a drink from the menu to get started.
                </p>
                <Link
                  href="/menu"
                  className="mt-6 inline-flex rounded-full bg-[#2b100c] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#57321f]"
                >
                  Browse menu
                </Link>
              </div>
            ) : (
              <div className="space-y-7">
                {items.map((item) => (
                  <article
                    key={item.cart_item_id}
                    className="flex min-h-[124px] items-center gap-4 rounded-[20px] border border-[#91735f] bg-[#f8f7f5] p-3 sm:gap-5 sm:px-4"
                  >
                    <div className="relative h-[88px] w-[78px] shrink-0 overflow-hidden bg-[#e8ded4] sm:h-[92px] sm:w-[82px]">
                      <Image
                        src={getProductImageUrl(item.image_url)}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="82px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[18px] font-bold leading-tight">
                        {item.product_name}
                      </h2>
                      <p className="mt-1 text-[15px] leading-snug">
                        size: {item.size}
                      </p>
                      <p className="text-[15px] leading-snug">
                        topping:{" "}
                        {item.toppings.length
                          ? item.toppings
                              .map((topping) => topping.topping_name)
                              .join(", ")
                          : "none"}
                      </p>
                      <p className="text-[15px] leading-snug">
                        price:{" "}
                        {money(Math.round(item.line_total / item.quantity))}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex h-[28px] items-center gap-4 rounded-full border border-[#8e6e57] px-3 text-[15px]">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.product_name}`}
                          onClick={() => updateQuantity(item.cart_item_id, -1)}
                          className="px-0.5 leading-none hover:text-[#8a5f40]"
                        >
                          -
                        </button>
                        <span className="min-w-3 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.product_name}`}
                          onClick={() => updateQuantity(item.cart_item_id, 1)}
                          disabled={item.quantity >= item.stock}
                          className="px-0.5 leading-none hover:text-[#8a5f40] disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${item.product_name}`}
                        onClick={() => removeItem(item.cart_item_id)}
                        className="px-1 text-xs text-[#806b5e] underline underline-offset-2 hover:text-[#2b100c]"
                      >
                        remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside aria-labelledby="checkout-title" className="lg:pt-[17px]">
            <h2
              id="checkout-title"
              className="mb-4 text-center text-[23px] font-bold"
            >
              Checkout
            </h2>
            <div className="mb-7 grid grid-cols-2 gap-4">
              <button
                type="button"
                aria-pressed={pickupMethod === "AT_COUNTER"}
                onClick={() => setPickupMethod("AT_COUNTER")}
                className={`rounded-full px-3 py-[10px] text-[15px] font-medium text-white transition-colors ${pickupMethod === "AT_COUNTER" ? "bg-[#715039]" : "bg-[#ac9381] hover:bg-[#937763]"}`}
              >
                PICK UP
              </button>
              <button
                type="button"
                aria-pressed={pickupMethod === "DELIVERY"}
                onClick={() => setPickupMethod("DELIVERY")}
                className={`rounded-full px-3 py-[10px] text-[15px] font-medium text-white transition-colors ${pickupMethod === "DELIVERY" ? "bg-[#715039]" : "bg-[#ac9381] hover:bg-[#937763]"}`}
              >
                DELIVERY
              </button>
            </div>

            <dl className="space-y-[18px] px-1 text-[16px]">
              <div className="flex items-center justify-between gap-4">
                <dt>cart</dt>
                <dd className="tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>discount</dt>
                <dd>{discount > 0 ? `-${money(discount)}` : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Thuế bổ sung</dt>
                <dd>—</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>shipping</dt>
                <dd>—</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t-2 border-[#442317] pt-3 text-[17px] font-semibold">
                <dt>total</dt>
                <dd className="tabular-nums">{money(total)}</dd>
              </div>
            </dl>

            <label className="mt-5 block text-sm">
              Mã giảm giá
              <input
                value={promotionCode}
                onChange={(e) => setPromotionCode(e.target.value)}
                maxLength={50}
                placeholder="Nhập mã nếu có"
                className="mt-2 w-full rounded-full border border-[#bda18d] bg-white px-4 py-2"
              />
            </label>
            <p className="mt-3 text-xs text-[#806b5e]">
              Giá và mã giảm giá sẽ được kiểm tra trước bước thanh toán.
            </p>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={openPayment}
              className="mx-auto mt-7 block min-h-[54px] w-[208px] rounded-full bg-[#d4c7bd] px-6 py-3 text-[20px] font-bold text-[#8a7b72] transition enabled:bg-[#715039] enabled:text-white enabled:hover:bg-[#2b100c] disabled:cursor-not-allowed"
            >
              PAYMENT
            </button>
          </aside>
        </div>
      </div>

      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          selectedItems={items.filter((item) => item.selected)}
          total={total}
          promotionCode={promotionCode}
          pickupMethod={pickupMethod}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </main>
  );
}
