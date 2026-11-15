import { apiRequest } from "./client";

export type OrderSize = "S" | "M" | "L";

export type PickupMethod = "AT_COUNTER" | "TAKEAWAY" | "DELIVERY";

export interface OrderTopping {
  topping_id: string;
  topping_name: string;
  price: number;
}

export interface OrderItem {
  orderitem_id: string;
  product_id: string;
  product_name: string;
  image_url?: string | null;
  size: OrderSize | string;
  quantity: number;
  note?: string | null;
  unit_price: number;
  line_total: number;
  toppings: OrderTopping[];
}

export interface OrderPayment {
  payment_id: string;
  status: string;
  provider: string;
  method: string;
  payment_url: string | null;
  amount: number;
  transaction_id: string | null;
  paid_at: string | null;
}

/** Shape returned by `/orders/:id`, `/orders/me` and `/admin/orders/:id`. */
export interface OrderDetail {
  order_id: string;
  order_code: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  expires_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_note: string | null;
  pickup_method: string | null;
  delivery_address: string | null;
  scheduled_at: string | null;
  items: OrderItem[];
  payment: OrderPayment | null;
}

export interface CreateOrderItemBody {
  product_id: string;
  size: OrderSize;
  quantity: number;
  topping_ids?: string[];
  note?: string;
}

export interface CreateOrderBody {
  items: CreateOrderItemBody[];
  customer_name: string;
  customer_phone: string;
  promotion_code?: string;
  pickup_method?: PickupMethod;
  delivery_address?: string;
  order_note?: string;
  scheduled_at?: string;
}

export interface OrderPage {
  items: OrderDetail[];
  page: number;
  page_size: number;
  total: number;
}

/** Shape returned by `POST /orders` and `PATCH /orders/:id/status`. */
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

/** Shape returned by `POST /orders/quote` (no order is created). */
export interface OrderQuote {
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  loyalty_earned: number;
}

/** Refund receipt (`GET /orders/:id/refund`). */
export interface RefundReceipt {
  refund_id: string;
  order_id: string;
  payment_id: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  provider: string;
  reason: string;
  provider_ref: string | null;
  requested_at: string;
  completed_at: string | null;
}

/** Shape returned by `POST /orders/:id/cancel`. */
export interface CancelOrderResult extends OrderSummary {
  refund: RefundReceipt | null;
}

export const ordersApi = {
  /** Server-side price check; never creates an order or reserves stock. */
  quote: (body: CreateOrderBody) =>
    apiRequest<OrderQuote>("/orders/quote", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Create the order; replaying the same key returns the same order. */
  create: (body: CreateOrderBody, key: string) =>
    apiRequest<OrderSummary>("/orders", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    }),
  /** Order history for the signed-in customer, newest first. */
  mine: (page = 1) => apiRequest<OrderPage>(`/orders/me?page=${page}`),
  detail: (id: string) =>
    apiRequest<OrderDetail>(`/orders/${encodeURIComponent(id)}`),
  cancel: (id: string) =>
    apiRequest<CancelOrderResult>(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),
  refund: (id: string) =>
    apiRequest<RefundReceipt>(`/orders/${encodeURIComponent(id)}/refund`),
};