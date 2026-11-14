import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DrinkSize = 'S' | 'M' | 'L';
export type PaymentProvider = 'mock' | 'vnpay';
export type PaymentMethod = 'E_WALLET' | 'CARD' | 'VNPAYQR' | 'VNBANK' | 'INTCARD' | 'GATEWAY';
export type PickupMethod = 'AT_COUNTER' | 'TAKEAWAY';

export type OrderLifecycleStatus =
  | 'PENDING'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentAttemptStatus =
  | 'PENDING'
  | 'PAID'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface ToppingOption {
  topping_id: string;
  topping_name: string;
  price: number;
  is_active: boolean;
}

export interface SizeOption {
  size: DrinkSize;
  add_price: number;
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
  unit_price: number;
  quantity: number;
  line_total: number;
  stock: number;
  is_active?: boolean;
  note?: string;
  selected: boolean;
}

export interface Promotion {
  promotion_id: string;
  code: string;
  promotion_name: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  min_amount: number;
  max_discount: number | null;
  is_active: boolean;
}

export interface StoredPaymentBody {
  order_id: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  bank_code?: string;
  simulate_result?: 'SUCCESS' | 'FAILED';
  created_at: string;
}

export interface OrderActionsContract {
  can_cancel: boolean;
  can_retry_payment: boolean;
  can_change_method: boolean;
  reason?: string | null;
}

export interface OrderSyncPayload {
  order_id: string;
  order_code?: string;
  user_id?: string | null;
  status: OrderLifecycleStatus;
  total?: number;
  payment?: {
    payment_id?: string;
    provider?: PaymentProvider;
    method?: PaymentMethod;
    status: PaymentAttemptStatus;
    next_check_at?: string | null;
    checked_at?: string | null;
  } | null;
  refund?: {
    refund_id: string;
    amount: number;
    status: 'PENDING' | 'REFUNDED' | 'FAILED';
    reason?: string;
    completed_at?: string | null;
  } | null;
  actions?: OrderActionsContract | null;
  message?: string | null;
}

export interface StockConflictHint {
  product_id?: string;
  product_name?: string;
  available_stock?: number;
  message: string;
}

export const AVAILABLE_SIZES: SizeOption[] = [
  { size: 'S', add_price: 0 },
  { size: 'M', add_price: 5000 },
  { size: 'L', add_price: 10000 },
];

export const AVAILABLE_TOPPINGS: ToppingOption[] = [
  { topping_id: 'top-01', topping_name: 'Trân châu đen', price: 5000, is_active: true },
  { topping_id: 'top-02', topping_name: 'Trân châu trắng', price: 5000, is_active: true },
  { topping_id: 'top-03', topping_name: 'Pudding trứng', price: 8000, is_active: true },
  { topping_id: 'top-04', topping_name: 'Kem Cheese', price: 10000, is_active: true },
  { topping_id: 'top-05', topping_name: 'Thạch dừa', price: 6000, is_active: true },
  { topping_id: 'top-06', topping_name: 'Đào miếng', price: 8000, is_active: true },
];

export const SAMPLE_PROMOTIONS: Promotion[] = [
  {
    promotion_id: 'e2a7b8c9-1111-4222-8333-000000000001',
    code: 'WELCOME10',
    promotion_name: 'Chào bạn mới giảm 10% (tối đa 30K, đơn từ 50K)',
    discount_type: 'PERCENT',
    discount_value: 10,
    min_amount: 50000,
    max_discount: 30000,
    is_active: true,
  },
  {
    promotion_id: 'e2a7b8c9-1111-4222-8333-000000000002',
    code: 'GIAM20K',
    promotion_name: 'Giảm 20.000đ cho đơn từ 100K',
    discount_type: 'FIXED',
    discount_value: 20000,
    min_amount: 100000,
    max_discount: null,
    is_active: true,
  },
  {
    promotion_id: 'e2a7b8c9-1111-4222-8333-000000000003',
    code: 'GIAM10K',
    promotion_name: 'Giảm 10.000đ cho mọi đơn từ 60K',
    discount_type: 'FIXED',
    discount_value: 10000,
    min_amount: 60000,
    max_discount: null,
    is_active: true,
  },
  {
    promotion_id: 'e2a7b8c9-1111-4222-8333-000000000004',
    code: 'COFFEE5',
    promotion_name: 'Giảm 5% cho mọi đơn hàng (tối đa 15K)',
    discount_type: 'PERCENT',
    discount_value: 5,
    min_amount: 0,
    max_discount: 15000,
    is_active: true,
  },
];

export const INITIAL_DEMO_CART: CartItem[] = [
  {
    cart_item_id: 'prod-01__M__top-04',
    product_id: 'prod-01',
    product_name: 'Cappuccino',
    image_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&auto=format&fit=crop&q=80',
    base_price: 45000,
    size: 'M',
    add_price: 5000,
    toppings: [{ topping_id: 'top-04', topping_name: 'Kem Cheese', price: 10000, is_active: true }],
    unit_price: 50000,
    quantity: 1,
    line_total: 60000,
    stock: 15,
    is_active: true,
    note: 'Ít ngọt',
    selected: true,
  },
  {
    cart_item_id: 'prod-02__L__top-01_top-06',
    product_id: 'prod-02',
    product_name: 'Trà Đào Cam Sả',
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&auto=format&fit=crop&q=80',
    base_price: 39000,
    size: 'L',
    add_price: 10000,
    toppings: [
      { topping_id: 'top-01', topping_name: 'Trân châu đen', price: 5000, is_active: true },
      { topping_id: 'top-06', topping_name: 'Đào miếng', price: 8000, is_active: true },
    ],
    unit_price: 49000,
    quantity: 2,
    line_total: 124000,
    stock: 20,
    is_active: true,
    note: 'Bình thường',
    selected: true,
  },
  {
    cart_item_id: 'prod-03__S__',
    product_id: 'prod-03',
    product_name: 'Cà Phê Sữa Đá',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
    base_price: 35000,
    size: 'S',
    add_price: 0,
    toppings: [],
    unit_price: 35000,
    quantity: 1,
    line_total: 35000,
    stock: 10,
    is_active: true,
    note: 'Nhiều đá',
    selected: true,
  },
];

export function generateIdempotencyKey(prefix: 'chk' | 'pay' = 'pay'): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `brewlite-${prefix}-${randomPart}`;
}

export function buildCartItemKey(productId: string, size: DrinkSize, toppings: ToppingOption[]): string {
  const sortedToppingIds = [...toppings]
    .map((t) => t.topping_id)
    .sort()
    .join('_');
  return `${productId}__${size}__${sortedToppingIds}`;
}

export function calculateItemPricing(
  basePrice: number,
  size: DrinkSize,
  toppings: ToppingOption[],
  quantity: number
): { add_price: number; unit_price: number; line_total: number } {
  const sizeObj = AVAILABLE_SIZES.find((s) => s.size === size) || { add_price: 0 };
  const add_price = sizeObj.add_price;
  const unit_price = basePrice + add_price;
  const toppingsTotal = toppings.reduce((sum, t) => sum + t.price, 0);
  const line_total = (unit_price + toppingsTotal) * quantity;
  return { add_price, unit_price, line_total };
}

interface CartState {
  items: CartItem[];
  pickupMethod: PickupMethod;
  appliedPromotion: Promotion | null;
  promoError: string | null;

  checkoutOwnerUserId: string | null;
  activeOrderId: string | null;
  activeOrderCode: string | null;
  activePaymentId: string | null;
  checkoutKey: string | null;
  paymentKey: string | null;
  paymentBody: StoredPaymentBody | null;
  canChangeMethod: boolean;
  canRetryPayment: boolean;
  canCancelOrder: boolean;
  isPaymentPendingReconcile: boolean;
  nextReconcileAt: string | null;
  reconcileReason: string | null;
  stockConflictHints: StockConflictHint[];

  addItem: (payload: {
    product_id: string;
    product_name: string;
    image_url: string;
    base_price: number;
    size: DrinkSize;
    toppings: ToppingOption[];
    quantity?: number;
    stock?: number;
    note?: string;
  }) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  updateItemOptions: (
    cartItemId: string,
    newSize: DrinkSize,
    newToppings: ToppingOption[],
    newNote?: string
  ) => void;
  toggleSelectItem: (cartItemId: string) => void;
  toggleSelectAll: (selected: boolean) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  removeSelectedItems: () => void;
  resetDemoCart: () => void;
  setPickupMethod: (method: PickupMethod) => void;

  applyPromotionCode: (code: string) => boolean;
  removePromotion: () => void;

  ensureUserCheckoutSession: (userId: string | null) => void;
  getOrCreateCheckoutKey: (userId?: string | null) => string;
  getOrCreatePaymentKey: (orderId: string) => string;
  savePendingPaymentAttempt: (body: StoredPaymentBody, paymentId?: string | null) => void;
  syncCheckoutWithOrder: (order: OrderSyncPayload, currentUserId?: string | null) => void;
  syncCatalogStock: (
    latestProducts: Array<{ product_id: string; stock: number; base_price?: number; is_active?: boolean }>,
    conflictMessage?: string
  ) => void;
  clearStockConflictHints: () => void;
  resetCheckoutSession: () => void;

  getTotalBadgeCount: () => number;
  getSelectedItems: () => CartItem[];
  getAggregatedQtyByProduct: () => Record<string, number>;
  getPricingSummary: () => {
    subtotal: number;
    discount: number;
    total: number;
    loyaltyPointsEarned: number;
  };
}

function invalidateOrderSessionOnCartChange(state: CartState) {
  if (state.isPaymentPendingReconcile) {
    return {};
  }
  return {
    activeOrderId: null,
    activeOrderCode: null,
    activePaymentId: null,
    checkoutKey: generateIdempotencyKey('chk'),
    paymentKey: null,
    paymentBody: null,
    canChangeMethod: true,
    canRetryPayment: true,
    canCancelOrder: true,
    reconcileReason: null,
    stockConflictHints: [],
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: INITIAL_DEMO_CART,
      pickupMethod: 'AT_COUNTER',
      appliedPromotion: null,
      promoError: null,

      checkoutOwnerUserId: null,
      activeOrderId: null,
      activeOrderCode: null,
      activePaymentId: null,
      checkoutKey: null,
      paymentKey: null,
      paymentBody: null,
      canChangeMethod: true,
      canRetryPayment: true,
      canCancelOrder: true,
      isPaymentPendingReconcile: false,
      nextReconcileAt: null,
      reconcileReason: null,
      stockConflictHints: [],

      addItem: (payload) => {
        const qty = payload.quantity ?? 1;
        const stock = payload.stock ?? 20;
        if (stock <= 0) return;

        const key = buildCartItemKey(payload.product_id, payload.size, payload.toppings);
        const state = get();
        const { items } = state;
        const existingIndex = items.findIndex((item) => item.cart_item_id === key);

        if (existingIndex > -1) {
          const existing = items[existingIndex];
          const newQty = Math.min(existing.quantity + qty, existing.stock);
          const pricing = calculateItemPricing(
            existing.base_price,
            existing.size,
            existing.toppings,
            newQty
          );
          const updated = [...items];
          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            ...pricing,
            selected: true,
          };
          set({
            items: updated,
            ...invalidateOrderSessionOnCartChange(state),
          });
        } else {
          const pricing = calculateItemPricing(
            payload.base_price,
            payload.size,
            payload.toppings,
            qty
          );
          const newItem: CartItem = {
            cart_item_id: key,
            product_id: payload.product_id,
            product_name: payload.product_name,
            image_url: payload.image_url,
            base_price: payload.base_price,
            size: payload.size,
            toppings: payload.toppings,
            quantity: qty,
            stock,
            is_active: true,
            note: payload.note || '',
            selected: true,
            ...pricing,
          };
          set({
            items: [...items, newItem],
            ...invalidateOrderSessionOnCartChange(state),
          });
        }
      },

      updateQuantity: (cartItemId, delta) => {
        const state = get();
        const updated = state.items
          .map((item) => {
            if (item.cart_item_id !== cartItemId) return item;
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            const clampedQty = Math.min(nextQty, item.stock);
            const pricing = calculateItemPricing(
              item.base_price,
              item.size,
              item.toppings,
              clampedQty
            );
            return {
              ...item,
              quantity: clampedQty,
              ...pricing,
            };
          })
          .filter(Boolean) as CartItem[];

        set({
          items: updated,
          ...invalidateOrderSessionOnCartChange(state),
        });
      },

      updateItemOptions: (cartItemId, newSize, newToppings, newNote) => {
        const state = get();
        const { items } = state;
        const target = items.find((i) => i.cart_item_id === cartItemId);
        if (!target) return;

        const newKey = buildCartItemKey(target.product_id, newSize, newToppings);
        const pricing = calculateItemPricing(
          target.base_price,
          newSize,
          newToppings,
          target.quantity
        );

        if (newKey !== cartItemId && items.some((i) => i.cart_item_id === newKey)) {
          const updated = items
            .map((item) => {
              if (item.cart_item_id === newKey) {
                const mergedQty = Math.min(item.quantity + target.quantity, item.stock);
                const mergedPricing = calculateItemPricing(
                  item.base_price,
                  item.size,
                  item.toppings,
                  mergedQty
                );
                return {
                  ...item,
                  quantity: mergedQty,
                  ...mergedPricing,
                };
              }
              return item;
            })
            .filter((item) => item.cart_item_id !== cartItemId);
          set({
            items: updated,
            ...invalidateOrderSessionOnCartChange(state),
          });
        } else {
          const updated = items.map((item) => {
            if (item.cart_item_id !== cartItemId) return item;
            return {
              ...item,
              cart_item_id: newKey,
              size: newSize,
              toppings: newToppings,
              note: newNote !== undefined ? newNote : item.note,
              ...pricing,
            };
          });
          set({
            items: updated,
            ...invalidateOrderSessionOnCartChange(state),
          });
        }
      },

      toggleSelectItem: (cartItemId) => {
        const state = get();
        set({
          items: state.items.map((item) =>
            item.cart_item_id === cartItemId ? { ...item, selected: !item.selected } : item
          ),
          ...invalidateOrderSessionOnCartChange(state),
        });
      },

      toggleSelectAll: (selected) => {
        const state = get();
        set({
          items: state.items.map((item) => ({ ...item, selected })),
          ...invalidateOrderSessionOnCartChange(state),
        });
      },

      removeItem: (cartItemId) => {
        const state = get();
        set({
          items: state.items.filter((item) => item.cart_item_id !== cartItemId),
          ...invalidateOrderSessionOnCartChange(state),
        });
      },

      clearCart: () => {
        set({
          items: [],
          appliedPromotion: null,
          promoError: null,
          activeOrderId: null,
          activeOrderCode: null,
          activePaymentId: null,
          checkoutKey: null,
          paymentKey: null,
          paymentBody: null,
          canChangeMethod: true,
          canRetryPayment: true,
          canCancelOrder: true,
          isPaymentPendingReconcile: false,
          nextReconcileAt: null,
          reconcileReason: null,
          stockConflictHints: [],
        });
      },

      removeSelectedItems: () => {
        set((state) => ({
          items: state.items.filter((item) => !item.selected),
          appliedPromotion: null,
          promoError: null,
          activeOrderId: null,
          activeOrderCode: null,
          activePaymentId: null,
          checkoutKey: null,
          paymentKey: null,
          paymentBody: null,
          canChangeMethod: true,
          canRetryPayment: false,
          canCancelOrder: true,
          isPaymentPendingReconcile: false,
          nextReconcileAt: null,
          reconcileReason: null,
          stockConflictHints: [],
        }));
      },

      resetDemoCart: () => {
        set({
          items: INITIAL_DEMO_CART,
          appliedPromotion: null,
          promoError: null,
          activeOrderId: null,
          activeOrderCode: null,
          activePaymentId: null,
          checkoutKey: generateIdempotencyKey('chk'),
          paymentKey: null,
          paymentBody: null,
          canChangeMethod: true,
          canRetryPayment: true,
          canCancelOrder: true,
          isPaymentPendingReconcile: false,
          nextReconcileAt: null,
          reconcileReason: null,
          stockConflictHints: [],
        });
      },

      setPickupMethod: (method) => {
        const state = get();
        set({
          pickupMethod: method,
          ...invalidateOrderSessionOnCartChange(state),
        });
      },

      applyPromotionCode: (rawCode) => {
        const code = rawCode.trim().toUpperCase();
        if (!code) {
          set({ promoError: 'Vui lòng nhập mã giảm giá.' });
          return false;
        }

        const promo = SAMPLE_PROMOTIONS.find((p) => p.code === code);
        if (!promo || !promo.is_active) {
          set({ promoError: 'Mã giảm giá không tồn tại hoặc đã hết hiệu lực.' });
          return false;
        }

        const subtotal = get()
          .items.filter((i) => i.selected)
          .reduce((sum, i) => sum + i.line_total, 0);

        if (subtotal < promo.min_amount) {
          set({
            promoError: `Đơn hàng cần tối thiểu ${promo.min_amount.toLocaleString('vi-VN')}đ để áp dụng mã ${promo.code}.`,
          });
          return false;
        }

        const state = get();
        set({
          appliedPromotion: promo,
          promoError: null,
          ...invalidateOrderSessionOnCartChange(state),
        });
        return true;
      },

      removePromotion: () => {
        const state = get();
        set({
          appliedPromotion: null,
          promoError: null,
          ...invalidateOrderSessionOnCartChange(state),
        });
      },

      ensureUserCheckoutSession: (userId) => {
        const { checkoutOwnerUserId } = get();
        if (checkoutOwnerUserId && checkoutOwnerUserId !== userId) {
          set({
            checkoutOwnerUserId: userId,
            activeOrderId: null,
            activeOrderCode: null,
            activePaymentId: null,
            checkoutKey: generateIdempotencyKey('chk'),
            paymentKey: null,
            paymentBody: null,
            canChangeMethod: true,
            canRetryPayment: true,
            canCancelOrder: true,
            isPaymentPendingReconcile: false,
            nextReconcileAt: null,
            reconcileReason: null,
            stockConflictHints: [],
          });
        } else if (!checkoutOwnerUserId && userId) {
          set({ checkoutOwnerUserId: userId });
        }
      },

      getOrCreateCheckoutKey: (userId) => {
        if (userId !== undefined) {
          get().ensureUserCheckoutSession(userId);
        }
        const currentKey = get().checkoutKey;
        if (currentKey && currentKey.length >= 8) {
          return currentKey;
        }
        const freshKey = generateIdempotencyKey('chk');
        set({ checkoutKey: freshKey });
        return freshKey;
      },

      getOrCreatePaymentKey: (orderId) => {
        const state = get();
        if (state.activeOrderId === orderId && state.paymentKey && state.paymentKey.length >= 8) {
          return state.paymentKey;
        }
        const freshKey = generateIdempotencyKey('pay');
        set({
          activeOrderId: orderId,
          paymentKey: freshKey,
        });
        return freshKey;
      },

      savePendingPaymentAttempt: (body, paymentId) => {
        set({
          activeOrderId: body.order_id,
          activePaymentId: paymentId ?? get().activePaymentId,
          paymentBody: body,
        });
      },

      syncCheckoutWithOrder: (order, currentUserId) => {
        const state = get();

        if (currentUserId && order.user_id && order.user_id !== currentUserId) {
          return;
        }
        if (
          state.checkoutOwnerUserId &&
          currentUserId &&
          state.checkoutOwnerUserId !== currentUserId
        ) {
          get().ensureUserCheckoutSession(currentUserId);
        }

        const orderStatus = order.status;
        const paymentStatus = order.payment?.status;
        const actions = order.actions;

        if (
          orderStatus === 'PAID' ||
          orderStatus === 'PREPARING' ||
          orderStatus === 'READY' ||
          orderStatus === 'COMPLETED' ||
          paymentStatus === 'PAID' ||
          paymentStatus === 'SUCCESS'
        ) {
          if (!state.activeOrderId || state.activeOrderId === order.order_id) {
            set({
              items: state.items.filter((item) => !item.selected),
              appliedPromotion: null,
              promoError: null,
              activeOrderId: null,
              activeOrderCode: order.order_code ?? null,
              activePaymentId: null,
              checkoutKey: null,
              paymentKey: null,
              paymentBody: null,
              canChangeMethod: false,
              canRetryPayment: false,
              canCancelOrder: actions?.can_cancel ?? orderStatus === 'PAID',
              isPaymentPendingReconcile: false,
              nextReconcileAt: null,
              reconcileReason: null,
            });
          }
          return;
        }

        if (orderStatus === 'CANCELLED') {
          if (!state.activeOrderId || state.activeOrderId === order.order_id) {
            set({
              activeOrderId: null,
              activeOrderCode: null,
              activePaymentId: null,
              checkoutKey: generateIdempotencyKey('chk'),
              paymentKey: null,
              paymentBody: null,
              canChangeMethod: true,
              canRetryPayment: false,
              canCancelOrder: false,
              isPaymentPendingReconcile: false,
              nextReconcileAt: null,
              reconcileReason: order.actions?.reason ?? null,
            });
          }
          return;
        }

        const isStillPendingPayment =
          paymentStatus === 'PENDING' && actions?.can_change_method === false;

        if (isStillPendingPayment) {
          set({
            activeOrderId: order.order_id,
            activeOrderCode: order.order_code ?? state.activeOrderCode,
            activePaymentId: order.payment?.payment_id ?? state.activePaymentId,
            canChangeMethod: false,
            canRetryPayment: actions?.can_retry_payment ?? false,
            canCancelOrder: actions?.can_cancel ?? false,
            isPaymentPendingReconcile: true,
            nextReconcileAt: order.payment?.next_check_at ?? null,
            reconcileReason:
              actions?.reason ||
              order.message ||
              'Giao dịch trước đang chờ đối soát kết quả từ cổng thanh toán. Vui lòng kiểm tra trạng thái trước khi đổi phương thức.',
          });
          return;
        }

        const isConfirmedFailed =
          orderStatus === 'PAYMENT_FAILED' ||
          paymentStatus === 'FAILED' ||
          paymentStatus === 'CANCELLED' ||
          actions?.can_change_method === true;

        if (isConfirmedFailed) {
          set({
            activeOrderId: order.order_id,
            activeOrderCode: order.order_code ?? state.activeOrderCode,
            activePaymentId: order.payment?.payment_id ?? null,
            paymentKey: generateIdempotencyKey('pay'),
            paymentBody: null,
            canChangeMethod: actions?.can_change_method ?? true,
            canRetryPayment: actions?.can_retry_payment ?? true,
            canCancelOrder: actions?.can_cancel ?? true,
            isPaymentPendingReconcile: false,
            nextReconcileAt: null,
            reconcileReason:
              actions?.reason ||
              'Giao dịch trước đã xác nhận thất bại. Bạn có thể chọn lại phương thức khác (Ví/Thẻ) và thử thanh toán lại trên cùng đơn hàng.',
          });
        }
      },

      syncCatalogStock: (latestProducts, conflictMessage) => {
        const state = get();
        const hints: StockConflictHint[] = [];

        const totalQtyByProd: Record<string, number> = {};
        state.items.forEach((item) => {
          if (item.selected) {
            totalQtyByProd[item.product_id] =
              (totalQtyByProd[item.product_id] || 0) + item.quantity;
          }
        });

        const updatedItems = state.items.map((item) => {
          const matched = latestProducts.find((p) => p.product_id === item.product_id);
          if (!matched) return item;

          const newStock = matched.stock;
          const newBasePrice = matched.base_price ?? item.base_price;
          const newActive = matched.is_active ?? true;
          const requestedTotalForProd = totalQtyByProd[item.product_id] || item.quantity;

          if (!newActive || newStock <= 0) {
            hints.push({
              product_id: item.product_id,
              product_name: item.product_name,
              available_stock: 0,
              message: `Món "${item.product_name}" vừa tạm hết hàng (tồn kho = 0). Vui lòng bỏ chọn hoặc xóa món này.`,
            });
          } else if (requestedTotalForProd > newStock) {
            hints.push({
              product_id: item.product_id,
              product_name: item.product_name,
              available_stock: newStock,
              message: `Món "${item.product_name}" chỉ còn ${newStock} phần trong kho (bạn đang chọn tổng cộng ${requestedTotalForProd} ly). Vui lòng giảm số lượng.`,
            });
          }

          const pricing = calculateItemPricing(
            newBasePrice,
            item.size,
            item.toppings,
            item.quantity
          );

          return {
            ...item,
            stock: newStock,
            base_price: newBasePrice,
            is_active: newActive,
            ...pricing,
          };
        });

        if (hints.length === 0 && conflictMessage) {
          hints.push({ message: conflictMessage });
        }

        set({
          items: updatedItems,
          stockConflictHints: hints,
          checkoutKey: generateIdempotencyKey('chk'),
        });
      },

      clearStockConflictHints: () => {
        set({ stockConflictHints: [] });
      },

      resetCheckoutSession: () => {
        set({
          activeOrderId: null,
          activeOrderCode: null,
          activePaymentId: null,
          checkoutKey: generateIdempotencyKey('chk'),
          paymentKey: null,
          paymentBody: null,
          canChangeMethod: true,
          canRetryPayment: true,
          canCancelOrder: true,
          isPaymentPendingReconcile: false,
          nextReconcileAt: null,
          reconcileReason: null,
          stockConflictHints: [],
        });
      },

      getTotalBadgeCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSelectedItems: () => {
        return get().items.filter((item) => item.selected);
      },

      getAggregatedQtyByProduct: () => {
        const map: Record<string, number> = {};
        get()
          .items.filter((i) => i.selected)
          .forEach((item) => {
            map[item.product_id] = (map[item.product_id] || 0) + item.quantity;
          });
        return map;
      },

      getPricingSummary: () => {
        const selectedItems = get().items.filter((item) => item.selected);
        const subtotal = selectedItems.reduce((sum, item) => sum + i.line_total, 0);
        const promo = get().appliedPromotion;

        let discount = 0;
        if (promo && subtotal >= promo.min_amount) {
          if (promo.discount_type === 'PERCENT') {
            discount = Math.round((subtotal * promo.discount_value) / 100);
            if (promo.max_discount !== null) {
              discount = Math.min(discount, promo.max_discount);
            }
          } else {
            discount = promo.discount_value;
          }
          discount = Math.min(discount, subtotal);
        }

        const total = Math.max(0, subtotal - discount);
        const loyaltyPointsEarned = Math.floor(total / 10000);

        return { subtotal, discount, total, loyaltyPointsEarned };
      },
    }),
    {
      name: 'brewlite-cart-storage',
    }
  )
);

export function syncCheckoutWithOrder(
  order: OrderSyncPayload,
  currentUserId?: string | null
): void {
  useCartStore.getState().syncCheckoutWithOrder(order, currentUserId);
}
