import { apiRequest } from "./client";
export interface CreateOrderBody {
  items: {
    product_id: string;
    size: "S" | "M" | "L";
    quantity: number;
    topping_ids: string[];
    note?: string;
  }[];
  customer_name: string;
  customer_phone: string;
  pickup_method: "AT_COUNTER" | "TAKEAWAY" | "DELIVERY";
  delivery_address?: string;
  order_note?: string;
  scheduled_at?: string;
  promotion_code?: string;
}
export interface OrderSummary {
  order_id: string;
  order_code: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  expires_at: string | null;
}
export interface OrderDetail extends OrderSummary {
  customer_name: string | null;
  customer_phone: string | null;
  order_note: string | null;
  pickup_method: string | null;
  delivery_address: string | null;
  scheduled_at: string | null;
  items: {
    orderitem_id: string;
    product_id: string;
    product_name: string;
    image_url: string | null;
    size: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    note: string | null;
    toppings: { topping_id: string; topping_name: string; price: number }[];
  }[];
  payment: {
    payment_id: string;
    status: string;
    provider: string;
    method: "vnpay" | "momo" | "banking" | "cash";
    payment_url: string | null;
    amount: number;
    transaction_id: string | null;
    paid_at: string | null;
  } | null;
}
export interface OrderPage {
  items: OrderDetail[];
  page: number;
  page_size: number;
  total: number;
}
export const ordersApi = {
  quote: (body: CreateOrderBody) =>
    apiRequest<{ subtotal: number; discount: number; total: number }>(
      "/orders/quote",
      { method: "POST", body: JSON.stringify(body) },
    ),
  create: (body: CreateOrderBody, key: string) =>
    apiRequest<OrderSummary>("/orders", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    }),
  mine: (page = 1, signal?: AbortSignal) =>
    apiRequest<OrderPage>(`/orders/me?page=${page}`, { signal }),
  one: (id: string, signal?: AbortSignal) =>
    apiRequest<OrderDetail>(`/orders/${encodeURIComponent(id)}`, { signal }),
  cancel: (id: string) =>
    apiRequest<OrderSummary>(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),
};
