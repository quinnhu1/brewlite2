"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { paymentsApi, type PaymentResult } from "@/lib/api/payments";
import { ordersApi } from "@/lib/api/orders";
import { syncCheckoutWithOrder } from "@/lib/checkout/sync";
import { ApiError } from "@/lib/api/client";
import { useCartStore } from "@/store/useCartStore";

const MAX_CHECKS = 30;
const RECHECK_DELAY_MS = 3_000;
const MAX_RECONCILIATIONS = 3;
const RECONCILE_DELAY_MS = 300_000;

function Result() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get("reference");
  const callbackError = params.get("error");
  const gatewayCode = params.get("gateway_code");
  const invalid = callbackError !== null || !ref;
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (invalid || !ref) return;
    const controller = new AbortController();
    const reference = ref;
    let attempts = 0;
    let reconciliations = 0;
    let reconcileAfter = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (controller.signal.aborted) return;
      attempts++;
      try {
        let current = await paymentsApi.byReference(
          reference,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (
          current.payment_status === "pending" &&
          reconciliations < MAX_RECONCILIATIONS &&
          Date.now() >= reconcileAfter &&
          (!current.next_check_at ||
            Date.now() >= new Date(current.next_check_at).getTime())
        ) {
          reconciliations++;
          reconcileAfter = Date.now() + RECONCILE_DELAY_MS;
          try {
            current = await paymentsApi.reconcile(
              current.payment_id,
              controller.signal,
            );
          } catch {
            // Keep checking the stored status while IPN or a later QueryDR may settle it.
          }
        }
        if (controller.signal.aborted) return;
        setResult(current);
        setError("");
        const order = await ordersApi.one(current.order_id, controller.signal);
        if (controller.signal.aborted) return;
        syncCheckoutWithOrder(order);
        if (current.payment_status === "failed") return;
        if (
          current.payment_status === "refunded" ||
          order.cancellation_requested_at
        ) {
          router.replace(`/orders/${current.order_id}`);
          return;
        }
        if (current.payment_status === "success") {
          useCartStore.getState().finishCheckout(current.order_id);
          router.replace(`/orders/${current.order_id}?confirmed=1`);
          return;
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) {
          router.replace(
            `/signin?next=${encodeURIComponent(`/payment/result?reference=${encodeURIComponent(reference)}`)}`,
          );
          return;
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "Không kiểm tra được giao dịch.",
        );
      }

      if (attempts >= MAX_CHECKS) setTimedOut(true);
      else timer = setTimeout(() => void check(), RECHECK_DELAY_MS);
    }

    void check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [invalid, ref, router]);
  return (
    <main className="mx-auto min-h-[65vh] w-full max-w-xl px-6 pb-16 pt-32">
      <h1 className="mb-6 text-2xl font-bold">Kết quả thanh toán</h1>
      {invalid ? (
        <p>
          {callbackError === "configuration"
            ? "Cấu hình VNPay chưa hợp lệ. Hãy kiểm tra đơn trong tài khoản."
            : "Không xác thực được phản hồi thanh toán. Hãy kiểm tra đơn trong tài khoản."}
        </p>
      ) : result?.payment_status === "failed" ? (
        <p>
          Thanh toán chưa thành công.
          {result.response_code && ` Mã VNPay ${result.response_code}.`} Giỏ
          hàng vẫn được giữ nguyên.
        </p>
      ) : (
        <p>
          {gatewayCode && /^\d{2}$/.test(gatewayCode) && gatewayCode !== "00" &&
            `Trang VNPay trả về mã ${gatewayCode}. `}
          {timedOut
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
      {result?.payment_status === "failed" && (
        <Link className="coffee-button mt-6 inline-block" href={`/orders/${result.order_id}`}>
          Chọn phương thức khác và thử lại
        </Link>
      )}
      {result?.payment_status === "pending" && (
        <p className="mt-4 text-sm">
          Muốn đổi cách thanh toán? Mở chi tiết đơn và chọn lại QR hoặc Thẻ ngân hàng. Giao dịch đang chờ sẽ được dùng lại.
        </p>
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
