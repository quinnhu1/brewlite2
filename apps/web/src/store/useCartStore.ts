import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DrinkSize = "S" | "M" | "L";

export interface CartTopping {
  topping_id: string;
  topping_name: string;
  price: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  image_url?: string;
  base_price: number;
  size: DrinkSize;
  add_price: number;
  toppings: CartTopping[];
  quantity: number;
  note?: string;
  selected: boolean;
}

export interface OrderActions {
  can_cancel: boolean;
  can_retry_payment: boolean;
  can_change_method: boolean;
  reason?: string;
}

export interface SyncOrderPayload {
  order_id: string;
  user_id?: string;
  status: string;
  payment_status?: string;
  actions?: OrderActions;
}

interface CartState {
  userId: string | null;
  items: CartItem[];
  promoCode: string;
  discount: number;
  activeOrderId: string | null;
  checkoutKey: string | null;
  paymentKey: string | null;
  paymentBody: Record<string, unknown> | null;
  orderActions: OrderActions | null;
  setUserId: (userId: string | null) => void;
  addItem: (item: Omit<CartItem, "id" | "selected">) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateItemOptions: (
    id: string,
    size: DrinkSize,
    add_price: number,
    toppings: CartTopping[],
    note?: string
  ) => void;
  toggleSelect: (id: string) => void;
  removeItem: (id: string) => void;
  removeSelectedItems: () => void;
  clearCart: () => void;
  applyPromo: (code: string, discountAmount: number) => void;
  ensureCheckoutKey: () => string;
  ensurePaymentKey: () => string;
  setPaymentAttempt: (orderId: string, body: Record<string, unknown>) => void;
  syncCheckoutWithOrder: (order: SyncOrderPayload) => void;
  resetSampleData: () => void;
}

const makeKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const buildCartItemKey = (
  productId: string,
  size: DrinkSize,
  toppings: CartTopping[]
) => {
  const toppingIds = toppings
    .map((t) => t.topping_id)
    .sort()
    .join(",");
  return `${productId}__${size}__${toppingIds}`;
};

const INITIAL_ITEMS: CartItem[] = [
  {
    id: "p1__M__t1",
    product_id: "p1",
    product_name: "Cà Phê Sữa Đá Sài Gòn",
    base_price: 29000,
    size: "M",
    add_price: 5000,
    toppings: [{ topping_id: "t1", topping_name: "Kem Cheese Macchiato", price: 10000 }],
    quantity: 1,
    note: "Ít đá",
    selected: true,
  },
  {
    id: "p2__L__",
    product_id: "p2",
    product_name: "Trà Đào Cam Sả",
    base_price: 35000,
    size: "L",
    add_price: 10000,
    toppings: [],
    quantity: 2,
    note: "Bình thường",
    selected: true,
  },
];

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      userId: null,
      items: INITIAL_ITEMS,
      promoCode: "",
      discount: 0,
      activeOrderId: null,
      checkoutKey: null,
      paymentKey: null,
      paymentBody: null,
      orderActions: null,

      setUserId: (newUserId) => {
        const current = get().userId;
        if (current && current !== newUserId) {
          set({
            userId: newUserId,
            activeOrderId: null,
            checkoutKey: null,
            paymentKey: null,
            paymentBody: null,
            orderActions: null,
          });
        } else {
          set({ userId: newUserId });
        }
      },

      addItem: (item) => {
        const key = buildCartItemKey(item.product_id, item.size, item.toppings);
        const existing = get().items.find((i) => i.id === key);
        const updated = existing
          ? get().items.map((i) =>
              i.id === key ? { ...i, quantity: i.quantity + item.quantity } : i
            )
          : [...get().items, { ...item, id: key, selected: true }];

        set({
          items: updated,
          checkoutKey: makeKey("chk"),
          paymentBody: null,
        });
      },

      updateQuantity: (id, delta) => {
        const updated = get()
          .items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, Math.min(50, i.quantity + delta)) } : i
          );
        set({ items: updated, checkoutKey: makeKey("chk") });
      },

      updateItemOptions: (id, size, add_price, toppings, note) => {
        const target = get().items.find((i) => i.id === id);
        if (!target) return;
        const newKey = buildCartItemKey(target.product_id, size, toppings);
        const filtered = get().items.filter((i) => i.id !== id);
        const duplicate = filtered.find((i) => i.id === newKey);

        const nextItems = duplicate
          ? filtered.map((i) =>
              i.id === newKey
                ? { ...i, quantity: i.quantity + target.quantity, note: note ?? i.note }
                : i
            )
          : [
              ...filtered,
              { ...target, id: newKey, size, add_price, toppings, note },
            ];

        set({ items: nextItems, checkoutKey: makeKey("chk") });
      },

      toggleSelect: (id) =>
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, selected: !i.selected } : i
          ),
          checkoutKey: makeKey("chk"),
        }),

      removeItem: (id) =>
        set({
          items: get().items.filter((i) => i.id !== id),
          checkoutKey: makeKey("chk"),
        }),

      removeSelectedItems: () =>
        set({
          items: get().items.filter((i) => !i.selected),
          promoCode: "",
          discount: 0,
          activeOrderId: null,
          checkoutKey: null,
          paymentKey: null,
          paymentBody: null,
        }),

      clearCart: () =>
        set({
          items: [],
          promoCode: "",
          discount: 0,
          activeOrderId: null,
          checkoutKey: null,
          paymentKey: null,
          paymentBody: null,
          orderActions: null,
        }),

      applyPromo: (code, discountAmount) =>
        set({
          promoCode: code,
          discount: discountAmount,
          checkoutKey: makeKey("chk"),
        }),

      ensureCheckoutKey: () => {
        const existing = get().checkoutKey;
        if (existing) return existing;
        const next = makeKey("chk");
        set({ checkoutKey: next });
        return next;
      },

      ensurePaymentKey: () => {
        const existing = get().paymentKey;
        if (existing) return existing;
        const next = makeKey("pay");
        set({ paymentKey: next });
        return next;
      },

      setPaymentAttempt: (orderId, body) =>
        set({
          activeOrderId: orderId,
          paymentBody: body,
          paymentKey: get().paymentKey ?? makeKey("pay"),
        }),

      syncCheckoutWithOrder: (order) => {
        const state = get();
        if (order.user_id && state.userId && order.user_id !== state.userId) {
          return;
        }

        const isPaid =
          order.status === "PAID" || order.payment_status === "PAID" || order.payment_status === "SUCCESS";
        const isFailed =
          order.status === "PAYMENT_FAILED" || order.payment_status === "FAILED";
        const isCancelled = order.status === "CANCELLED";

        if (isPaid) {
          set({
            items: state.items.filter((i) => !i.selected),
            promoCode: "",
            discount: 0,
            activeOrderId: null,
            checkoutKey: null,
            paymentKey: null,
            paymentBody: null,
            orderActions: order.actions ?? {
              can_cancel: true,
              can_retry_payment: false,
              can_change_method: false,
            },
          });
          return;
        }

        if (isFailed) {
          set({
            activeOrderId: order.order_id,
            paymentBody: null,
            paymentKey: makeKey("pay"),
            orderActions: order.actions ?? {
              can_cancel: true,
              can_retry_payment: true,
              can_change_method: true,
            },
          });
          return;
        }

        if (isCancelled) {
          set({
            activeOrderId: null,
            checkoutKey: makeKey("chk"),
            paymentKey: makeKey("pay"),
            paymentBody: null,
            orderActions: order.actions ?? {
              can_cancel: false,
              can_retry_payment: false,
              can_change_method: false,
            },
          });
          return;
        }

        set({
          activeOrderId: order.order_id,
          orderActions: order.actions ?? {
            can_cancel: false,
            can_retry_payment: false,
            can_change_method: false,
            reason: "Giao dịch đang chờ đối soát từ cổng thanh toán",
          },
        });
      },

      resetSampleData: () =>
        set({
          items: INITIAL_ITEMS,
          promoCode: "",
          discount: 0,
          activeOrderId: null,
          checkoutKey: makeKey("chk"),
          paymentKey: makeKey("pay"),
          paymentBody: null,
          orderActions: null,
        }),
    }),
    { name: "brewlite-cart-storage" }
  )
);