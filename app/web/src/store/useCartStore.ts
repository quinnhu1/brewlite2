import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentBody } from "@/lib/api/payments";
import type { CreateOrderBody } from "@/lib/api/orders";
import type { ApiProductDetail } from "@/lib/api/products";
export type DrinkSize = "S" | "M" | "L";
export type PickupMethod = "AT_COUNTER" | "TAKEAWAY" | "DELIVERY";
export interface ToppingOption {
  topping_id: string;
  topping_name: string;
  price: number;
  is_active: boolean;
}
export interface CartItem {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  image_url: string;
  base_price: number;
  size: DrinkSize;
  add_price: number;
  toppings: ToppingOption[];
  quantity: number;
  stock: number;
  note?: string;
  unit_price: number;
  line_total: number;
  selected: boolean;
}
export type CartPayload = Omit<
  CartItem,
  "cart_item_id" | "unit_price" | "line_total" | "selected"
>;
export interface Checkout {
  paymentBody?: PaymentBody;
  quotedTotal?: number;
  userId: string;
  key: string;
  paymentKey: string;
  orderId?: string;
  body: CreateOrderBody;
  rows: { cart_item_id: string; quantity: number }[];
}
export function buildCartItemKey(
  item: Pick<CartPayload, "product_id" | "size" | "toppings" | "note">,
) {
  return `${item.product_id}__${item.size}__${item.toppings
    .map((t) => t.topping_id)
    .sort()
    .join("_")}__${item.note ?? ""}`;
}
function priced(item: CartItem): CartItem {
  const unit_price = item.base_price + item.add_price;
  return {
    ...item,
    unit_price,
    line_total:
      (unit_price + item.toppings.reduce((s, t) => s + t.price, 0)) *
      item.quantity,
  };
}
interface CartState {
  items: CartItem[];
  pickupMethod: PickupMethod;
  promotionCode: string;
  checkout: Checkout | null;
  addItem: (item: CartPayload) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  toggleSelectAll: (selected: boolean) => void;
  setPickupMethod: (method: PickupMethod) => void;
  setPromotionCode: (code: string) => void;
  setCheckout: (checkout: Checkout | null) => void;
  finishCheckout: (orderId: string) => void;
  refreshProducts: (products: ApiProductDetail[]) => void;
  getTotalBadgeCount: () => number;
}
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      pickupMethod: "AT_COUNTER",
      promotionCode: "",
      checkout: null,
      addItem: (payload) =>
        set((state) => {
          const id = buildCartItemKey(payload);
          const existing = state.items.find((i) => i.cart_item_id === id);
          const quantity = Math.min(
            50,
            payload.stock,
            (existing?.quantity ?? 0) + payload.quantity,
          );
          if (quantity < 1) return state;
          const next = priced({
            ...payload,
            quantity,
            cart_item_id: id,
            unit_price: 0,
            line_total: 0,
            selected: true,
          });
          return {
            items: existing
              ? state.items.map((i) => (i.cart_item_id === id ? next : i))
              : [...state.items, next],
          };
        }),
      updateQuantity: (id, delta) =>
        set((state) => ({
          items: state.items.flatMap((i) => {
            if (i.cart_item_id !== id) return [i];
            const quantity = Math.min(50, i.stock, i.quantity + delta);
            return quantity > 0 ? [priced({ ...i, quantity })] : [];
          }),
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.cart_item_id !== id) })),
      clearCart: () => set({ items: [], promotionCode: "" }),
      toggleSelectAll: (selected) =>
        set((s) => ({ items: s.items.map((i) => ({ ...i, selected })) })),
      setPickupMethod: (pickupMethod) => set({ pickupMethod }),
      setPromotionCode: (promotionCode) =>
        set({ promotionCode: promotionCode.trim().toUpperCase() }),
      setCheckout: (checkout) => set({ checkout }),
      finishCheckout: (orderId) =>
        set((s) => {
          if (s.checkout?.orderId !== orderId) return s;
          const bought = new Map(
            s.checkout.rows.map((i) => [i.cart_item_id, i.quantity]),
          );
          return {
            checkout: null,
            promotionCode: "",
            items: s.items.flatMap((i) => {
              const quantity = i.quantity - (bought.get(i.cart_item_id) ?? 0);
              return quantity > 0 ? [priced({ ...i, quantity })] : [];
            }),
          };
        }),
      refreshProducts: (products) =>
        set((s) => ({
          items: s.items.map((item) => {
            const product = products.find(
              (p) => p.productId === item.product_id,
            );
            const size = product?.product_size.find(
              (o) => o.size === item.size,
            );
            if (!product || !size) return item;
            const toppings = item.toppings.map((t) => {
              const current = product.toppings.find(
                (o) => o.topping_id === t.topping_id,
              );
              return current
                ? {
                    ...t,
                    topping_name: current.topping_name,
                    price: Number(current.price),
                  }
                : t;
            });
            return priced({
              ...item,
              product_name: product.productName,
              base_price: Number(product.basePrice),
              add_price: Number(size.add_price),
              stock: product.stock,
              toppings,
              image_url: product.imageUrl ?? item.image_url,
            });
          }),
        })),
      getTotalBadgeCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "brewlite-cart-v3", skipHydration: true },
  ),
);
