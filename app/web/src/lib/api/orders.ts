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
