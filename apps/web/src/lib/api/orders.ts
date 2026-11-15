import { apiRequest } from "./client";
export interface CreateOrderBody {
  replacement_of_order_id?: string;
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
  payment: PaymentAttempt | null;
  payment_attempts: PaymentAttempt[];
  refunds: RefundReceipt[];
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  replacement_of_order_id: string | null;
  message: string | null;
  actions: {
    can_cancel: boolean;
    can_retry_payment: boolean;
    can_change_method: boolean;
    can_resume_payment: boolean;
    can_reconcile: boolean;
    can_replace: boolean;
    can_prepare: boolean;
  };
}
export interface PaymentAttempt {
  payment_id: string;
  status: string;
  provider: string;
  method: "vnpay" | "momo" | "banking" | "cash";
  bank_code: string | null;
  idempotency_key: string;
  payment_url: string | null;
  amount: number;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
  response_code: string | null;
  next_check_at: string | null;
  review_required: boolean;
  reconciliation_note: string | null;
}
export interface RefundReceipt {
  refund_id: string;
  payment_id: string;
  amount: number;
  provider: string;
  status:
    "requested" | "processing" | "succeeded" | "failed" | "review_required";
  reason: string;
  requested_at: string;
  completed_at: string | null;
  provider_ref: string | null;
  response_code: string | null;
  provider_status: string | null;
  message: string | null;
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
  cancel: (id: string, reason?: string) =>
    apiRequest<OrderDetail>(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
