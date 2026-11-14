"use client";

import React, { useState } from "react";
import { useCartStore, DrinkSize, CartTopping } from "../../store/useCartStore";
import PaymentModal from "../../components/cart/PaymentModal";

const SIZE_OPTIONS: { size: DrinkSize; add_price: number }[] = [
  { size: "S", add_price: 0 },
  { size: "M", add_price: 5000 },
  { size: "L", add_price: 10000 },
];

const TOPPING_OPTIONS: CartTopping[] = [
  { topping_id: "t1", topping_name: "Kem Cheese Macchiato", price: 10000 },
  { topping_id: "t2", topping_name: "Trân châu đường đen", price: 8000 },
  { topping_id: "t3", topping_name: "Thạch cà phê", price: 7000 },
];

export default function CartPage() {
  const {
    items,
    promoCode,
    discount,
    updateQuantity,
    updateItemOptions,
    toggleSelect,
    removeItem,
    clearCart,
    applyPromo,
    resetSampleData,
  } = useCartStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState<DrinkSize>("M");
  const [editToppings, setEditToppings] = useState<CartTopping[]>([]);
  const [editNote, setEditNote] = useState<string>("");
  const [promoInput, setPromoInput] = useState<string>(promoCode);
  const [promoMessage, setPromoMessage] = useState<string>("");
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  const selectedItems = items.filter((i) => i.selected);

  const subtotal = selectedItems.reduce((sum, item) => {
    const toppingSum = item.toppings.reduce((t, top) => t + top.price, 0);
    const unitPrice = item.base_price + item.add_price + toppingSum;
    return sum + unitPrice * item.quantity;
  }, 0);

  const finalDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - finalDiscount);

  const handleApplyPromo = (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase();
    setPromoInput(code);
    if (!code) {
      applyPromo("", 0);
      setPromoMessage("");
      return;
    }
    if (code === "WELCOME10") {
      const calc = Math.min(Math.round(subtotal * 0.1), 30000);
      applyPromo(code, calc);
      setPromoMessage("Đã áp mã WELCOME10 (Giảm 10%, tối đa 30.000đ)");
    } else if (code === "GIAM20K") {
      if (subtotal < 60000) {
        setPromoMessage("Đơn tối thiểu 60.000đ mới áp dụng được GIAM20K");
        return;
      }
      applyPromo(code, 20000);
      setPromoMessage("Đã áp mã GIAM20K (-20.000đ)");
    } else {
      setPromoMessage("Mã giảm giá không hợp lệ hoặc đã hết hạn");
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Giỏ hàng BrewLite ({items.reduce((s, i) => s + i.quantity, 0)} món)
          </h1>
          <p className="text-sm text-stone-600">
            Giá được kiểm tra và chốt trực tiếp từ Database khi tạo đơn
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetSampleData}
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            Khôi phục dữ liệu mẫu
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Làm trống giỏ
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-base font-medium text-stone-700">
            Giỏ hàng của bạn đang trống.
          </p>
          <button
            type="button"
            onClick={resetSampleData}
            className="mt-4 rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Thêm lại món mẫu để kiểm thử
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => {
              const toppingSum = item.toppings.reduce((t, top) => t + top.price, 0);
              const lineTotal = (item.base_price + item.add_price + toppingSum) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelect(item.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <h3 className="font-bold text-stone-900">{item.product_name}</h3>
                        <p className="text-xs text-stone-600">
                          Size: <strong>{item.size}</strong> (+{item.add_price.toLocaleString("vi-VN")}đ)
                          {item.toppings.length > 0 &&
                            ` • Topping: ${item.toppings.map((t) => t.topping_name).join(", ")}`}
                        </p>
                        {item.note && (
                          <p className="text-xs italic text-stone-500">Ghi chú: {item.note}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditSize(item.size);
                            setEditToppings(item.toppings);
                            setEditNote(item.note ?? "");
                          }}
                          className="mt-1 text-xs font-semibold text-amber-800 underline"
                        >
                          Đổi Size / Topping
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-stone-900">
                        {lineTotal.toLocaleString("vi-VN")}đ
                      </p>
                      <div className="mt-2 inline-flex items-center rounded-lg border border-stone-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-2.5 py-1 text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-2.5 py-1 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          Xóa món
                        </button>
                      </div>
                    </div>
                  </div>

                  {editingId === item.id && (
                    <div className="mt-3 rounded-xl bg-stone-50 p-3 text-xs">
                      <div className="mb-2 flex gap-2">
                        {SIZE_OPTIONS.map((opt) => (
                          <button
                            key={opt.size}
                            type="button"
                            onClick={() => setEditSize(opt.size)}
                            className={`rounded-lg border px-3 py-1 font-semibold ${
                              editSize === opt.size
                                ? "border-amber-800 bg-amber-800 text-white"
                                : "border-stone-300 bg-white"
                            }`}
                          >
                            Size {opt.size} (+{opt.add_price.toLocaleString("vi-VN")}đ)
                          </button>
                        ))}
                      </div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {TOPPING_OPTIONS.map((top) => {
                          const checked = editToppings.some(
                            (t) => t.topping_id === top.topping_id
                          );
                          return (
                            <button
                              key={top.topping_id}
                              type="button"
                              onClick={() =>
                                setEditToppings(
                                  checked
                                    ? editToppings.filter(
                                        (t) => t.topping_id !== top.topping_id
                                      )
                                    : [...editToppings, top]
                                )
                              }
                              className={`rounded-lg border px-2.5 py-1 ${
                                checked
                                  ? "border-amber-700 bg-amber-100 font-semibold"
                                  : "border-stone-300 bg-white"
                              }`}
                            >
                              {top.topping_name} (+{top.price.toLocaleString("vi-VN")}đ)
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Ghi chú (ít đá, ít ngọt...)"
                          className="flex-1 rounded-lg border border-stone-300 px-2 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const addPrice =
                              SIZE_OPTIONS.find((s) => s.size === editSize)?.add_price ?? 0;
                            updateItemOptions(
                              item.id,
                              editSize,
                              addPrice,
                              editToppings,
                              editNote
                            );
                            setEditingId(null);
                          }}
                          className="rounded-lg bg-stone-900 px-3 py-1 font-semibold text-white"
                        >
                          Lưu tùy chọn mới
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">Tóm tắt đơn hàng</h2>
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Nhập mã (WELCOME10, GIAM20K)"
                  className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleApplyPromo(promoInput)}
                  className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Áp dụng
                </button>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleApplyPromo("WELCOME10")}
                  className="rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-900"
                >
                  WELCOME10
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPromo("GIAM20K")}
                  className="rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-900"
                >
                  GIAM20K
                </button>
              </div>
              {promoMessage && (
                <p className="mt-1 text-xs text-amber-800">{promoMessage}</p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Tạm tính ({selectedItems.length} dòng chọn):</span>
                <span>{subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Giảm giá:</span>
                <span>-{finalDiscount.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900">
                <span>Tổng cộng:</span>
                <span>{total.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => setIsPaymentOpen(true)}
              className="mt-5 w-full rounded-xl bg-amber-800 py-3 text-sm font-bold text-white hover:bg-amber-900 disabled:opacity-50"
            >
              Thanh toán ({total.toLocaleString("vi-VN")}đ)
            </button>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        subtotal={subtotal}
        discount={finalDiscount}
        total={total}
      />
    </main>
  );
}