'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  useCartStore,
  AVAILABLE_SIZES,
  AVAILABLE_TOPPINGS,
  SAMPLE_PROMOTIONS,
  CartItem,
  DrinkSize,
  ToppingOption,
} from '../../store/useCartStore';
import PaymentModal, { OrderConfirmationResult } from '../../components/cart/PaymentModal';

export default function CartPage() {
  const {
    items,
    pickupMethod,
    appliedPromotion,
    promoError,
    updateQuantity,
    updateItemOptions,
    toggleSelectItem,
    toggleSelectAll,
    removeItem,
    clearCart,
    removeSelectedItems,
    resetDemoCart,
    setPickupMethod,
    applyPromotionCode,
    removePromotion,
    getTotalBadgeCount,
    getSelectedItems,
    getPricingSummary,
  } = useCartStore();

  const [promoInput, setPromoInput] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState<DrinkSize>('M');
  const [editToppings, setEditToppings] = useState<ToppingOption[]>([]);
  const [editNote, setEditNote] = useState<string>('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderConfirmationResult | null>(null);

  const badgeCount = getTotalBadgeCount();
  const selectedItems = getSelectedItems();
  const pricing = getPricingSummary();
  const { subtotal, discount, total, loyaltyPointsEarned } = pricing;
  const allSelected = items.length > 0 && items.every((item) => item.selected);

  const startEditingItem = (item: CartItem) => {
    setEditingItemId(item.cart_item_id);
    setEditSize(item.size);
    setEditToppings(item.toppings);
    setEditNote(item.note || '');
  };

  const toggleEditTopping = (topping: ToppingOption) => {
    const exists = editToppings.some((t) => t.topping_id === topping.topping_id);
    if (exists) {
      setEditToppings(editToppings.filter((t) => t.topping_id !== topping.topping_id));
    } else {
      setEditToppings([...editToppings, topping]);
    }
  };

  const saveItemEdits = (cartItemId: string) => {
    updateItemOptions(cartItemId, editSize, editToppings, editNote);
    setEditingItemId(null);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    applyPromotionCode(promoInput);
  };

  const handlePaymentSuccess = (result?: OrderConfirmationResult) => {
    if (result) {
      setLastOrder(result);
    }
    removeSelectedItems();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-16">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="mx-auto max-w-5xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/menu"
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
            >
              ← Thực đơn
            </Link>
            <div>
              <h1 className="text-lg font-extrabold text-amber-950 tracking-tight">
                BrewLite • Giỏ hàng của bạn
              </h1>
              <p className="text-xs text-stone-500">
                Đặt cà phê không tiền mặt — Nhận nước nhanh tại quầy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1.5 text-amber-950">
            <span className="text-xs font-bold">Giỏ hàng ({badgeCount})</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6">
        {lastOrder && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  ĐẶT ĐƠN THÀNH CÔNG • {lastOrder.status}
                </span>
                <h2 className="text-base font-bold text-emerald-950 mt-1.5">
                  Mã đơn hàng: <span className="font-mono">{lastOrder.order_code}</span> — Mời bạn tới quầy nhận đồ uống khi có thông báo READY!
                </h2>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Đã thanh toán {lastOrder.total.toLocaleString('vi-VN')}đ qua{' '}
                  {lastOrder.payment_method === 'E_WALLET' ? 'Ví điện tử (QR)' : 'Thẻ ngân hàng'} •
                  Mã GD: {lastOrder.transaction_id} • Tích lũy +{lastOrder.loyalty_earned} điểm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLastOrder(null)}
                className="self-start sm:self-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                Ẩn thông báo
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-stone-800">Giỏ hàng của bạn đang trống</h2>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
              Hãy khám phá thực đơn đồ uống BrewLite, chọn kích cỡ Size và Topping yêu thích để thêm vào giỏ hàng nhé.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/menu"
                className="rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-900 transition"
              >
                Quay lại trang Thực đơn (Menu)
              </Link>
              <button
                type="button"
                onClick={resetDemoCart}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition"
              >
                + Nạp lại 3 món mẫu để Demo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-amber-800 focus:ring-amber-700"
                  />
                  <span>
                    Chọn tất cả ({selectedItems.length}/{items.length} dòng món)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {!confirmClearAll ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Xóa tất cả giỏ hàng
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
                      <span className="text-xs text-rose-800 font-medium">Xác nhận làm trống giỏ?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearCart();
                          setConfirmClearAll(false);
                        }}
                        className="rounded bg-rose-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Đồng ý
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="rounded bg-white px-2 py-0.5 text-xs font-medium text-stone-600 border border-stone-300"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {items.map((item) => {
                const isEditing = editingItemId === item.cart_item_id;
                const toppingsText =
                  item.toppings.length > 0
                    ? item.toppings.map((t) => `${t.topping_name} (+${t.price.toLocaleString('vi-VN')}đ)`).join(', ')
                    : 'Không thêm topping';

                return (
                  <div
                    key={item.cart_item_id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                      item.selected ? 'border-amber-300/90' : 'border-stone-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelectItem(item.cart_item_id)}
                        className="mt-2 h-4 w-4 rounded border-stone-300 text-amber-800 focus:ring-amber-700 cursor-pointer"
                      />

                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="h-20 w-20 rounded-xl object-cover border border-stone-200 flex-shrink-0 bg-stone-100"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold text-stone-900">
                              {item.product_name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                                Size {item.size} {item.add_price > 0 ? `(+${item.add_price.toLocaleString('vi-VN')}đ)` : '(+0đ)'}
                              </span>
                              <span className="text-stone-400">•</span>
                              <span>Đơn giá: {item.unit_price.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-base font-extrabold text-amber-900">
                              {item.line_total.toLocaleString('vi-VN')}đ
                            </p>
                            <p className="text-[11px] text-stone-400">
                              Tồn kho: {item.stock} ly
                            </p>
                          </div>
                        </div>

                        <p className="mt-1.5 text-xs text-stone-600">
                          <span className="font-semibold text-stone-700">Topping:</span> {toppingsText}
                        </p>
                        {item.note && (
                          <p className="mt-0.5 text-xs text-stone-500 italic">
                            Ghi chú: &ldquo;{item.note}&rdquo;
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.cart_item_id, -1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700 hover:bg-stone-100"
                            >
                              −
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-bold text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.cart_item_id, 1)}
                              disabled={item.quantity >= item.stock}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                isEditing ? setEditingItemId(null) : startEditingItem(item)
                              }
                              className="font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                            >
                              {isEditing ? 'Đóng chỉnh sửa' : 'Đổi Size / Topping'}
                            </button>

                            <button
                              type="button"
                              onClick={() => removeItem(item.cart_item_id)}
                              className="font-semibold text-rose-600 hover:text-rose-800"
                            >
                              Xóa món
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-3 rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 space-y-3">
                            <div>
                              <p className="text-xs font-bold text-stone-800 mb-1.5">
                                Chọn lại kích cỡ (Size):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {AVAILABLE_SIZES.map((s) => (
                                  <button
                                    key={s.size}
                                    type="button"
                                    onClick={() => setEditSize(s.size)}
                                    className={`rounded-lg px-3 py-1 text-xs font-semibold border transition ${
                                      editSize === s.size
                                        ? 'border-amber-800 bg-amber-800 text-white'
                                        : 'border-stone-300 bg-white text-stone-700 hover:border-amber-400'
                                    }`}
                                  >
                                    Size {s.size} (+{s.add_price.toLocaleString('vi-VN')}đ)
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-bold text-stone-800 mb-1.5">
                                Chọn lại Topping đi kèm:
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {AVAILABLE_TOPPINGS.map((top) => {
                                  const checked = editToppings.some(
                                    (t) => t.topping_id === top.topping_id
                                  );
                                  return (
                                    <label
                                      key={top.topping_id}
                                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer ${
                                        checked
                                          ? 'border-amber-700 bg-amber-100/70 font-semibold text-amber-950'
                                          : 'border-stone-200 bg-white text-stone-700'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleEditTopping(top)}
                                        className="rounded border-stone-300 text-amber-800"
                                      />
                                      <span className="truncate">
                                        {top.topping_name} (+{top.price / 1000}k)
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-800 mb-1">
                                Ghi chú cho Barista:
                              </label>
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="Ví dụ: Ít ngọt, 50% đá..."
                                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-600"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => saveItemEdits(item.cart_item_id)}
                                className="rounded-lg bg-amber-800 px-3.5 py-1 text-xs font-bold text-white hover:bg-amber-900"
                              >
                                Lưu tùy chọn mới
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-stone-800 mb-2.5">
                  Hình thức nhận đồ uống
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPickupMethod('AT_COUNTER')}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      pickupMethod === 'AT_COUNTER'
                        ? 'border-amber-800 bg-amber-50 text-amber-950'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    Uống tại quán (Nhận tại quầy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupMethod('TAKEAWAY')}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      pickupMethod === 'TAKEAWAY'
                        ? 'border-amber-800 bg-amber-50 text-amber-950'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    Đóng gói mang đi (Takeaway)
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-stone-800 mb-2">
                  Mã khuyến mãi (Promotions)
                </h2>
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Nhập mã (VD: WELCOME10)"
                    className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono uppercase focus:border-amber-700 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-stone-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-stone-900 transition"
                  >
                    Áp dụng
                  </button>
                </form>

                {promoError && (
                  <p className="mt-2 text-xs text-rose-600 font-medium">{promoError}</p>
                )}

                {appliedPromotion && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
                    <div>
                      <span className="font-bold font-mono">{appliedPromotion.code}</span>
                      <p className="text-[11px] text-emerald-700">
                        {appliedPromotion.promotion_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removePromotion}
                      className="text-xs font-semibold text-rose-600 hover:underline ml-2"
                    >
                      Bỏ mã
                    </button>
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-stone-100">
                  <p className="text-[11px] text-stone-500 mb-1.5">
                    Chọn nhanh mã khuyến mãi đang hoạt động:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMOTIONS.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => {
                          setPromoInput(p.code);
                          applyPromotionCode(p.code);
                        }}
                        className="rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1 text-[11px] font-mono font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        {p.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm space-y-3">
                <h2 className="text-base font-extrabold text-stone-900">
                  Hóa đơn tạm tính
                </h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Số món đã chọn:</span>
                    <span className="font-semibold text-stone-800">
                      {selectedItems.reduce((s, i) => s + i.quantity, 0)} ly
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Tổng tiền trước giảm (subtotal):</span>
                    <span className="font-semibold text-stone-800">
                      {subtotal.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Số tiền giảm (discount):</span>
                    <span className="font-semibold">
                      -{discount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="border-t border-stone-200 pt-2.5 flex justify-between items-baseline">
                    <span className="font-bold text-stone-900">Tổng phải trả (total):</span>
                    <span className="text-2xl font-extrabold text-amber-900">
                      {total.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center justify-between">
                  <span>Điểm tích lũy sau khi PAID:</span>
                  <span className="font-bold">+{loyaltyPointsEarned} điểm</span>
                </div>

                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full rounded-xl bg-amber-800 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-900 transition disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed"
                >
                  {selectedItems.length === 0
                    ? 'Vui lòng chọn ít nhất 1 món'
                    : `Thanh toán • ${total.toLocaleString('vi-VN')}đ`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        selectedItems={selectedItems}
        pricing={pricing}
        appliedPromotion={appliedPromotion}
        pickupMethod={pickupMethod}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
