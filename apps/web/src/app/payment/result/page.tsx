'use client';

import React, { useEffect, useState } from 'react';
import { OrderSyncPayload, syncCheckoutWithOrder } from '../../../store/useCartStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PaymentResultPage() {
  const [orderData, setOrderData] = useState<OrderSyncPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || params.get('vnp_TxnRef');
    const paymentId = params.get('payment_id');
    const currentUserId = localStorage.getItem('brewlite_user_id');
    const token = localStorage.getItem('brewlite_access_token');

    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchAndSyncOrder = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: OrderSyncPayload = await res.json();
          setOrderData(data);
          syncCheckoutWithOrder(data, currentUserId);
        } else if (paymentId) {
          const reconcileRes = await fetch(
            `${API_BASE_URL}/payments/${paymentId}/reconcile`,
            {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (reconcileRes.ok) {
            const recData: OrderSyncPayload = await reconcileRes.json();
            setOrderData(recData);
            syncCheckoutWithOrder(recData, currentUserId);
          }
        }
      } catch {
        setStatusMessage(
          'Đang chờ kết nối máy chủ để xác minh kết quả giao dịch. Hệ thống không tự ý kết luận thất bại hoặc hoàn tiền khi chưa đối soát.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAndSyncOrder();
  }, []);

  const handleManualReconcile = async () => {
    if (!orderData || reconciling) return;
    setReconciling(true);
    setStatusMessage(null);

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('brewlite_access_token') : null;
    const currentUserId =
      typeof window !== 'undefined' ? localStorage.getItem('brewlite_user_id') : null;

    try {
      const paymentId = orderData.payment?.payment_id;
      const url = paymentId
        ? `${API_BASE_URL}/payments/${paymentId}/reconcile`
        : `${API_BASE_URL}/orders/${orderData.order_id}`;

      const res = await fetch(url, {
        method: paymentId ? 'POST' : 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const updated: OrderSyncPayload = await res.json();
        setOrderData(updated);
        syncCheckoutWithOrder(updated, currentUserId);
        setStatusMessage('Đã cập nhật trạng thái mới nhất từ hệ thống.');
      } else {
        setStatusMessage('Cổng thanh toán đang xử lý, vui lòng thử kiểm tra lại sau ít giây.');
      }
    } catch {
      setStatusMessage('Lỗi kết nối mạng khi đối soát trạng thái.');
    } finally {
      setReconciling(false);
    }
  };

  const isPaid =
    orderData?.status === 'PAID' ||
    orderData?.payment?.status === 'PAID' ||
    orderData?.payment?.status === 'SUCCESS';

  const isFailed =
    orderData?.status === 'PAYMENT_FAILED' || orderData?.payment?.status === 'FAILED';

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900">
          Kết quả Giao dịch Thanh toán — BrewLite
        </h1>

        {loading && (
          <p className="mt-4 text-sm text-stone-600">
            Đang đồng bộ kết quả giao dịch từ máy chủ...
          </p>
        )}

        {!loading && isPaid && (
          <div className="mt-4 space-y-3 rounded-xl bg-emerald-50 p-4 text-emerald-950">
            <p className="text-base font-bold">Thanh toán thành công (PAID)</p>
            <p className="text-xs">
              Mã đơn hàng: <strong>{orderData?.order_code || orderData?.order_id}</strong>.
              Các sản phẩm đã thanh toán đã được đồng bộ khỏi giỏ hàng.
            </p>
          </div>
        )}

        {!loading && isFailed && (
          <div className="mt-4 space-y-3 rounded-xl bg-red-50 p-4 text-red-950">
            <p className="text-base font-bold">
              Giao dịch thất bại đã xác nhận (PAYMENT_FAILED)
            </p>
            <p className="text-xs">
              Hệ thống đã giải phóng khóa phương thức cũ và tạo khóa giao dịch mới. Bạn có thể quay lại giỏ hàng để đổi phương thức thanh toán (Ví điện tử / Thẻ) trên cùng đơn hàng{' '}
              <strong>{orderData?.order_code || orderData?.order_id}</strong>.
            </p>
          </div>
        )}

        {!loading && !isPaid && !isFailed && (
          <div className="mt-4 space-y-3 rounded-xl bg-amber-50 p-4 text-amber-950">
            <p className="text-base font-bold">
              Đang đối soát kết quả thanh toán (PENDING)
            </p>
            <p className="text-xs">
              Giao dịch chưa có kết quả cuối cùng từ cổng thanh toán. Hệ thống giữ nguyên khóa giao dịch để tránh thu tiền 2 lần.
            </p>
            <button
              type="button"
              onClick={handleManualReconcile}
              disabled={reconciling}
              className="rounded-lg bg-amber-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {reconciling ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái ngay'}
            </button>
          </div>
        )}

        {statusMessage && (
          <p className="mt-3 text-xs font-medium text-stone-700">{statusMessage}</p>
        )}

        <div className="mt-6 flex gap-3">
          <a
            href="/cart"
            className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100"
          >
            Quay về Giỏ hàng (Thử lại / Đổi kênh)
          </a>
          {orderData?.order_id && (
            <a
              href={`/orders/${orderData.order_id}`}
              className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
            >
              Xem chi tiết đơn hàng
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
