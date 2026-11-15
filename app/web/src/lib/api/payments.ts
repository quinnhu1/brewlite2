import { apiRequest } from "./client";
export interface PaymentResult {
  payment_id: string;
  order_id: string;
  order_code: string;
  payment_status: string;
  order_status: string;
  provider: string;
  amount: number;
  transaction_id: string | null;
  paid_at: string | null;
  idempotency_key: string;
  reference: string | null;
  payment_url: string | null;
  expires_at: string | null;
  message?: string;
}
export interface PaymentConfig {
  provider: "mock" | "vnpay";
  configured: boolean;
  channels: string[];
  methods: ("vnpay" | "momo" | "banking")[];
  allow_simulate: boolean;
}
export interface PaymentBody {
  order_id: string;
  method: "vnpay" | "momo" | "banking";
  bank_code?: "VNPAYQR" | "VNBANK" | "INTCARD";
  simulate_result?: "SUCCESS" | "FAILED";
}
export const paymentsApi = {
  config: () => apiRequest<PaymentConfig>("/payments/config"),
  create: (body: PaymentBody, key: string) =>
    apiRequest<PaymentResult>("/payments", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    }),
  byReference: (ref: string, signal?: AbortSignal) =>
    apiRequest<PaymentResult>(
      `/payments/reference/${encodeURIComponent(ref)}`,
      { signal },
    ),
  reconcile: (id: string) =>
    apiRequest<PaymentResult>(`/payments/${encodeURIComponent(id)}/reconcile`, {
      method: "POST",
    }),
};
