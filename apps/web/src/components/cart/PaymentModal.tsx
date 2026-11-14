'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CartItem,
  OrderSyncPayload,
  PaymentMethod,
  PaymentProvider,
  PickupMethod,
  Promotion,
  useCartStore,
} from '../../store/useCartStore';

export interface OrderConfirmationResult {
  order_id: string;
  order_code: string;
  status: 'PAID' | 'PAYMENT_FAILED' | 'PENDING';
  total: number;
  payment_method: PaymentMethod;
  transaction_id: string;
  loyalty_earned: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  pickupMethod: PickupMethod;
  appliedPromotion: Promotion | null;
  pricing?: {
    subtotal: number;
    discount: number;
    total: number;
    loyaltyPointsEarned: number;
  };
  subtotal?: number;
  discount?: number;
  total?: number;
  loyaltyPointsEarned?: number;
  onPaymentSuccess: (result?: OrderConfirmationResult) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PaymentModal({
  isOpen,
  onClose,
  selectedItems,
  pickupMethod,
  appliedPromotion,
  pricing,
  subtotal = 0,
  discount = 0,
  total = 0,
  loyaltyPointsEarned = 0,
  onPaymentSuccess,
}: PaymentModalProps) {
  const resolvedPricing = pricing || {
    subtotal,
    discount,
    total,
    loyaltyPointsEarned,
  };

  const {
    activeOrderId,
    activeOrderCode,
    activePaymentId,
    paymentBody,
    canChangeMethod,
    isPaymentPendingReconcile,
    nextReconcileAt,
    reconcileReason,
    stockConflictHints,
    getOrCreateCheckoutKey,
    getOrCreatePaymentKey,
    savePendingPaymentAttempt,
    syncCheckoutWithOrder,
    syncCatalogStock,
    clearStockConflictHints,
  } = useCartStore();

  const [provider, setProvider] = useState<PaymentProvider>('mock');
  const [method, setMethod] = useState<PaymentMethod>('E_WALLET');
  const [simulateResult, setSimulateResult] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [mockAllowOverride, setMockAllowOverride] = useState<boolean>(true);

  const [step, setStep] = useState<'SELECT' | 'PROCESSING' | 'PENDING_RECONCILE' | 'FAILED' | 'SUCCESS'>('SELECT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quoteMismatchTotal, setQuoteMismatchTotal] = useState<number | null>(null);
  const [confirmedServerTotal, setConfirmedServerTotal] = useState<number>(resolvedPricing.total);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const isSubmittingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmedServerTotal(resolvedPricing.total);
    setQuoteMismatchTotal(null);
    setErrorMessage(null);

    if (paymentBody) {
      setProvider(paymentBody.provider);
      setMethod(paymentBody.method);
    }

    fetch(`${API_BASE_URL}/payments/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg) {
          if (typeof cfg.mock_allow_override === 'boolean') {
            setMockAllowOverride(cfg.mock_allow_override);
          }
          if (cfg.provider === 'vnpay' && !paymentBody) {
            setProvider('vnpay');
            setMethod('GATEWAY');
          }
        }
      })
      .catch(() => {});

    if (activeOrderId) {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('brewlite_access_token') : null;
      fetch(`${API_BASE_URL}/orders/${activeOrderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((orderData: OrderSyncPayload | null) => {
          if (orderData && orderData.order_id) {
            syncCheckoutWithOrder(orderData);
            if (orderData.status === 'PAYMENT_FAILED' || orderData.payment?.status === 'FAILED') {
              setStep('FAILED');
            } else if (orderData.payment?.status === 'PENDING') {
              setStep('PENDING_RECONCILE');
            }
          }
        })
        .catch(() => {});
    } else {
      setStep('SELECT');
    }
  }, [isOpen, activeOrderId, paymentBody, resolvedPricing.total, syncCheckoutWithOrder]);

  useEffect(() => {
    if (!nextReconcileAt) {
      setCooldownSeconds(0);
      return;
    }
    const updateTimer = () => {
      const diff = Math.ceil((new Date(nextReconcileAt).getTime() - Date.now()) / 1000);
      setCooldownSeconds(diff > 0 ? diff : 0);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [nextReconcileAt]);

  if (!isOpen) return null;

  const isMethodLocked = !canChangeMethod && isPaymentPendingReconcile;

  const refreshCatalogOnStockError = async (serverMessage: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (res.ok) {
        const products = await res.json();
        if (Array.isArray(products)) {
          syncCatalogStock(products, serverMessage);
          return;
        }
      }
    } catch {}
    syncCatalogStock([], serverMessage);
  };

  const handleConfirmPayment = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorMessage(null);
    clearStockConflictHints();
    setStep('PROCESSING');

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('brewlite_access_token') : null;
    const currentUserId =
      typeof window !== 'undefined' ? localStorage.getItem('brewlite_user_id') : null;

    try {
      let targetOrderId = activeOrderId;
      let targetOrderCode = activeOrderCode || `BL-${Date.now().toString().slice(-6)}`;

      if (!targetOrderId) {
        const checkoutKey = getOrCreateCheckoutKey(currentUserId);
        const orderItemsPayload = selectedItems.map((item) => ({
          product_id: item.product_id,
          size: item.size,
          quantity: item.quantity,
          topping_ids: item.toppings.map((t) => t.topping_id),
          note: item.note || undefined,
        }));

        try {
          const quoteRes = await fetch(`${API_BASE_URL}/orders/quote`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              pickup_method: pickupMethod,
              promo_code: appliedPromotion?.code || undefined,
              items: orderItemsPayload,
            }),
          });

          if (quoteRes.ok) {
            const quoteData = await quoteRes.json();
            if (
              typeof quoteData.total === 'number' &&
              quoteData.total !== confirmedServerTotal
            ) {
              setQuoteMismatchTotal(quoteData.total);
              setStep('SELECT');
              isSubmittingRef.current = false;
              return;
            }
          }

          const createOrderRes = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': checkoutKey,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              pickup_method: pickupMethod,
              promo_code: appliedPromotion?.code || undefined,
              items: orderItemsPayload,
            }),
          });

          if (createOrderRes.status === 400 || createOrderRes.status === 409) {
            const errBody = await createOrderRes.json().catch(() => ({}));
            const msg =
              errBody.message ||
              'Số lượng tồn kho vừa thay đổi hoặc không đủ hàng. Vui lòng kiểm tra lại giỏ hàng.';
            await refreshCatalogOnStockError(msg);
            setErrorMessage(msg);
            setStep('SELECT');
            isSubmittingRef.current = false;
            return;
          }

          if (createOrderRes.ok) {
            const createdOrder = await createOrderRes.json();
            targetOrderId = createdOrder.order_id || createdOrder.id;
            targetOrderCode = createdOrder.order_code || targetOrderCode;
          } else {
            targetOrderId = `ord-${Date.now()}`;
          }
        } catch {
          targetOrderId = `ord-${Date.now()}`;
        }
      }

      if (!targetOrderId) {
        setErrorMessage('Không thể khởi tạo đơn hàng. Vui lòng thử lại.');
        setStep('SELECT');
        isSubmittingRef.current = false;
        return;
      }

      const currentPaymentKey = getOrCreatePaymentKey(targetOrderId);
      const requestBody = paymentBody || {
        order_id: targetOrderId,
        provider,
        method,
        simulate_result: provider === 'mock' && mockAllowOverride ? simulateResult : undefined,
        created_at: new Date().toISOString(),
      };

      savePendingPaymentAttempt(requestBody);

      try {
        const payRes = await fetch(`${API_BASE_URL}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': currentPaymentKey,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            order_id: requestBody.order_id,
            provider: requestBody.provider,
            method: requestBody.method,
            simulate_result: requestBody.simulate_result,
          }),
        });

        if (payRes.status === 409) {
          const conflictData = await payRes.json().catch(() => ({}));
          syncCheckoutWithOrder({
            order_id: targetOrderId,
            order_code: targetOrderCode,
            status: 'PENDING',
            payment: {
              payment_id: conflictData.payment_id,
              status: 'PENDING',
              next_check_at: conflictData.next_check_at,
            },
            actions: {
              can_cancel: false,
              can_retry_payment: false,
              can_change_method: false,
              reason:
                conflictData.message ||
                'Đơn hàng đang có giao dịch chờ đối soát. Không tạo giao dịch thu tiền cạnh tranh.',
            },
          });
          setStep('PENDING_RECONCILE');
          isSubmittingRef.current = false;
          return;
        }

        if (payRes.ok) {
          const payData = await payRes.json();

          if (payData.payment_url && typeof window !== 'undefined') {
            savePendingPaymentAttempt(requestBody, payData.payment_id);
            window.location.href = payData.payment_url;
            return;
          }

          const finalStatus: 'PAID' | 'PAYMENT_FAILED' | 'PENDING' =
            payData.order_status ||
            (payData.status === 'SUCCESS' || payData.status === 'PAID'
              ? 'PAID'
              : payData.status === 'FAILED'
              ? 'PAYMENT_FAILED'
              : 'PENDING');

          syncCheckoutWithOrder({
            order_id: targetOrderId,
            order_code: payData.order_code || targetOrderCode,
            status: finalStatus,
            payment: {
              payment_id: payData.payment_id,
              provider: requestBody.provider,
              method: requestBody.method,
              status:
                finalStatus === 'PAID'
                  ? 'PAID'
                  : finalStatus === 'PAYMENT_FAILED'
                  ? 'FAILED'
                  : 'PENDING',
            },
            actions: payData.actions || {
              can_cancel: true,
              can_retry_payment: finalStatus === 'PAYMENT_FAILED',
              can_change_method: finalStatus === 'PAYMENT_FAILED',
            },
          });

          if (finalStatus === 'PAID') {
            setStep('SUCCESS');
          } else if (finalStatus === 'PAYMENT_FAILED') {
            setStep('FAILED');
          } else {
            setStep('PENDING_RECONCILE');
          }
          isSubmittingRef.current = false;
          return;
        }
      } catch {}

      await new Promise((resolve) => setTimeout(resolve, 650));
      if (simulateResult === 'SUCCESS') {
        syncCheckoutWithOrder({
          order_id: targetOrderId,
          order_code: targetOrderCode,
          status: 'PAID',
          payment: {
            payment_id: `pay-${Date.now()}`,
            provider: 'mock',
            method,
            status: 'PAID',
          },
          actions: {
            can_cancel: true,
            can_retry_payment: false,
            can_change_method: false,
          },
        });
        setStep('SUCCESS');
      } else {
        syncCheckoutWithOrder({
          order_id: targetOrderId,
          order_code: targetOrderCode,
          status: 'PAYMENT_FAILED',
          payment: {
            payment_id: `pay-${Date.now()}`,
            provider: 'mock',
            method,
            status: 'FAILED',
          },
          actions: {
            can_cancel: true,
            can_retry_payment: true,
            can_change_method: true,
          },
        });
        setStep('FAILED');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleReconcilePayment = async () => {
    if (!activePaymentId && !activeOrderId) return;
    if (cooldownSeconds > 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorMessage(null);

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('brewlite_access_token') : null;

    try {
      const endpoint = activePaymentId
        ? `${API_BASE_URL}/payments/${activePaymentId}/reconcile`
        : `${API_BASE_URL}/orders/${activeOrderId}`;
      const res = await fetch(endpoint, {
        method: activePaymentId ? 'POST' : 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data: OrderSyncPayload = await res.json();
        syncCheckoutWithOrder(data);
        if (data.status === 'PAID' || data.payment?.status === 'PAID') {
          setStep('SUCCESS');
        } else if (
          data.status === 'PAYMENT_FAILED' ||
          data.payment?.status === 'FAILED' ||
          data.actions?.can_change_method
        ) {
          setStep('FAILED');
        } else {
          setStep('PENDING_RECONCILE');
        }
      } else {
        setErrorMessage('Chưa nhận được kết quả cuối từ cổng thanh toán. Vui lòng kiểm tra lại sau ít giây.');
      }
    } catch {
      setErrorMessage('Không thể kết nối máy chủ đối soát. Giữ nguyên trạng thái chờ để tránh trừ tiền lặp.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              Thanh toán Không tiền mặt — BrewLite
            </h2>
            <p className="mt-0.5 text-xs font-medium text-amber-800">
              Thanh toán mô phỏng cho đồ án, không trừ tiền thật
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            aria-label="Đóng cửa sổ thanh toán"
          >
            ✕
          </button>
        </div>

        {quoteMismatchTotal !== null && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900">
            <p className="font-semibold">
              Giá sản phẩm trên hệ thống vừa được cập nhật!
            </p>
            <p className="mt-1">
              Tổng tiền mới từ Server là{' '}
              <strong>{quoteMismatchTotal.toLocaleString('vi-VN')}đ</strong> (thay vì{' '}
              {confirmedServerTotal.toLocaleString('vi-VN')}đ). Hệ thống không tự động trừ tiền khi chưa có xác nhận của bạn.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmedServerTotal(quoteMismatchTotal);
                setQuoteMismatchTotal(null);
              }}
              className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            >
              Đồng ý với mức giá mới ({quoteMismatchTotal.toLocaleString('vi-VN')}đ)
            </button>
          </div>
        )}

        {stockConflictHints.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-900">
            <p className="font-semibold">Không đủ tồn kho để giữ hàng:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
              {stockConflictHints.map((hint, idx) => (
                <li key={idx}>{hint.message}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-red-700">
              Giỏ hàng của bạn đã được giữ nguyên và cập nhật lại số lượng tồn mới nhất.
            </p>
          </div>
        )}

        {(step === 'SELECT' || step === 'FAILED') && (
          <div className="mt-4 space-y-4">
            {step === 'FAILED' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                <p className="font-bold">Giao dịch thanh toán thất bại (PAYMENT_FAILED)</p>
                <p className="mt-1 text-xs">
                  {reconcileReason ||
                    'Đơn hàng và giỏ hàng của bạn vẫn được giữ nguyên. Khóa thanh toán cũ đã được giải phóng — bạn có thể đổi phương thức (Ví sang Thẻ) và thử lại ngay.'}
                </p>
                {activeOrderId && (
                  <p className="mt-1 font-mono text-xs text-red-700">
                    Mã đơn đang giữ: {activeOrderCode || activeOrderId}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-800">
                Chọn phương thức thanh toán:
              </label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isMethodLocked}
                  onClick={() => {
                    setProvider('mock');
                    setMethod('E_WALLET');
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    provider === 'mock' && method === 'E_WALLET'
                      ? 'border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20'
                      : 'border-stone-200 hover:border-stone-300'
                  } ${isMethodLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="text-sm font-bold text-stone-900">Ví điện tử (QR)</span>
                  <span className="mt-0.5 text-xs text-stone-600">
                    Mô phỏng Ví điện tử (Luồng nghiệm thu chính)
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isMethodLocked}
                  onClick={() => {
                    setProvider('mock');
                    setMethod('CARD');
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    provider === 'mock' && method === 'CARD'
                      ? 'border-amber-700 bg-amber-50/70 ring-2 ring-amber-700/20'
                      : 'border-stone-200 hover:border-stone-300'
                  } ${isMethodLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="text-sm font-bold text-stone-900">Thẻ ngân hàng</span>
                  <span className="mt-0.5 text-xs text-stone-600">
                    Mô phỏng Thẻ ATM / Quốc tế (CARD)
                  </span>
                </button>
              </div>
            </div>

            {provider === 'mock' && mockAllowOverride && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <span className="block text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Chế độ kiểm thử & Demo bảo vệ đồ án:
                </span>
                <div className="mt-2 flex gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-emerald-800">
                    <input
                      type="radio"
                      name="simulateResult"
                      checked={simulateResult === 'SUCCESS'}
                      onChange={() => setSimulateResult('SUCCESS')}
                    />
                    Mô phỏng Thành công (PAID)
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-red-700">
                    <input
                      type="radio"
                      name="simulateResult"
                      checked={simulateResult === 'FAILED'}
                      onChange={() => setSimulateResult('FAILED')}
                    />
                    Mô phỏng Thất bại (PAYMENT_FAILED)
                  </label>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-stone-100 p-3.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Số món đã chọn:</span>
                <span className="font-medium">{selectedItems.length} dòng sản phẩm</span>
              </div>
              <div className="mt-1 flex justify-between text-stone-600">
                <span>Tạm tính:</span>
                <span>{resolvedPricing.subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              {resolvedPricing.discount > 0 && (
                <div className="mt-1 flex justify-between text-emerald-700">
                  <span>Giảm giá ({appliedPromotion?.code}):</span>
                  <span>-{resolvedPricing.discount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
                <span>Tổng thanh toán:</span>
                <span className="text-amber-800">
                  {confirmedServerTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <p className="mt-1 text-right text-xs text-stone-500">
                Điểm thưởng dự kiến sau khi PAID: +{resolvedPricing.loyaltyPointsEarned} điểm
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs font-medium text-red-600">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Quay lại giỏ hàng
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-900"
              >
                {step === 'FAILED'
                  ? `Thử thanh toán lại (${method === 'E_WALLET' ? 'Ví điện tử' : 'Thẻ'})`
                  : 'Xác nhận Đặt hàng & Thanh toán'}
              </button>
            </div>
          </div>
        )}

        {step === 'PROCESSING' && (
          <div className="py-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-800 border-t-transparent" />
            <p className="mt-4 font-semibold text-stone-800">
              Đang kiểm tra tồn kho và xử lý giao dịch...
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Hệ thống đang bảo vệ chống thanh toán trùng bằng khóa Idempotency-Key. Vui lòng không đóng trình duyệt.
            </p>
          </div>
        )}

        {step === 'PENDING_RECONCILE' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">Giao dịch đang chờ đối soát kết quả</p>
              <p className="mt-1 text-xs leading-relaxed">
                {reconcileReason ||
                  'Hệ thống chưa nhận được kết quả cuối cùng từ cổng thanh toán. Để bảo vệ an toàn tiền và tránh thu 2 lần, việc đổi sang phương thức khác tạm thời bị khóa cho đến khi đối soát hoàn tất.'}
              </p>
              {activeOrderCode && (
                <p className="mt-2 font-mono text-xs font-semibold">
                  Mã đơn hàng: {activeOrderCode}
                </p>
              )}
            </div>

            {errorMessage && (
              <p className="text-xs font-medium text-red-600">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Đóng tạm thời
              </button>
              <button
                type="button"
                disabled={cooldownSeconds > 0}
                onClick={handleReconcilePayment}
                className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cooldownSeconds > 0
                  ? `Kiểm tra lại sau (${cooldownSeconds}s)`
                  : 'Kiểm tra trạng thái với Cổng thanh toán'}
              </button>
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="mt-4 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>
            <h3 className="text-lg font-bold text-emerald-900">
              Thanh toán thành công (Trạng thái: PAID)
            </h3>
            <p className="text-xs text-stone-600">
              Mã đơn hàng:{' '}
              <strong className="font-mono text-stone-900">
                {activeOrderCode || 'BL-PAID'}
              </strong>{' '}
              — Bạn đã được cộng <strong>+{resolvedPricing.loyaltyPointsEarned} điểm thưởng</strong>.
              Các món đã mua đã được cập nhật khỏi giỏ hàng.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onPaymentSuccess({
                    order_id: activeOrderId || `ord-${Date.now()}`,
                    order_code: activeOrderCode || 'BL-PAID',
                    status: 'PAID',
                    total: confirmedServerTotal,
                    payment_method: method,
                    transaction_id: activePaymentId || `TXN-${Date.now().toString().slice(-6)}`,
                    loyalty_earned: resolvedPricing.loyaltyPointsEarned,
                  });
                  onClose();
                }}
                className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Hoàn tất & Theo dõi đơn hàng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
