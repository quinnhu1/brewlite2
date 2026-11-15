"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { paymentsApi, type PaymentResult } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "@/store/useCartStore";
function Result() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get("reference");
  const invalid = params.has("error") || !ref;
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState(0);
  useEffect(() => {
    if (invalid || !ref) return;
    const controller = new AbortController();
    let count = 0;
    let busy = false;
    let retryPrepared = false;
    async function check() {
      if (busy || controller.signal.aborted || count >= 30) return;
      busy = true;
      count++;
      try {
        let current = await paymentsApi.byReference(ref!, controller.signal);
        if (controller.signal.aborted) return;
        if (count === 1 && current.payment_status === "pending") {
          try {
            current = await paymentsApi.reconcile(current.payment_id);
          } catch {
            /* Preserve pending until a server-confirmed result is available. */
          }
        }
        setResult(current);
        setError("");
        setChecks(count);
        if (current.payment_status === "failed" && !retryPrepared) {
          retryPrepared = true;
          const state = useCartStore.getState();
          if (state.checkout?.orderId === current.order_id) {
            state.setCheckout({
              ...state.checkout,
              paymentKey: crypto.randomUUID(),
              paymentBody: undefined,
            });
          }
        }
        if (current.payment_status === "success") {
          useCartStore.getState().finishCheckout(current.order_id);
          router.replace(`/orders/${current.order_id}?confirmed=1`);
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401)
          router.replace(
            `/signin?next=${encodeURIComponent(`/payment/result?reference=${ref}`)}`,
          );
        else
          setError(
            reason instanceof Error
              ? reason.message
              : "Không kiểm tra được giao dịch.",
          );
      } finally {
        busy = false;
      }
    }
    void check();
    const timer = setInterval(() => {
      void check();
    }, 3000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [invalid, ref, router]);
  return (
    <main className="mx-auto min-h-[65vh] w-full max-w-xl px-6 pb-16 pt-32">
      <h1 className="mb-6 text-2xl font-bold">Kết quả thanh toán</h1>
      {invalid ? (
        <p>
          Không xác thực được phản hồi thanh toán. Hãy xem trạng thái đơn trong
          tài khoản.
        </p>
      ) : result?.payment_status === "failed" ? (
        <p>Thanh toán chưa thành công. Giỏ hàng vẫn được giữ nguyên.</p>
      ) : (
        <p>
          {checks >= 30
            ? "Chưa nhận được xác nhận cuối cùng. Bạn có thể kiểm tra với VNPay tại trang chi tiết đơn."
            : "Đang chờ máy chủ xác nhận giao dịch với VNPay..."}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}
      {result && (
        <Link
          className="mt-6 block underline"
          href={`/orders/${result.order_id}`}
        >
          Xem đơn #{result.order_code}
        </Link>
      )}
      <Link className="mt-6 block underline" href="/account">
        Về tài khoản và lịch sử đơn
      </Link>
    </main>
  );
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="pt-32 text-center">Đang kiểm tra thanh toán...</p>
      }
    >
      <Result />
    </Suspense>
  );
}
