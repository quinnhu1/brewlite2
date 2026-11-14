export type PaymentMethod = "vnpay" | "momo" | "banking";

export type VnpayBankCode = "VNPAYQR" | "VNBANK" | "INTCARD";

export type SimulateResult = "SUCCESS" | "FAILED";

/** Request body for `POST /payments`. */
export interface PaymentBody {
  order_id: string;
  method: PaymentMethod;
  bank_code?: VnpayBankCode;
  simulate_result?: SimulateResult;
}

/** Response from `POST /payments`. */
export interface PaymentResult {
  payment_id: string;
  reference: string;
  payment_status: string;
  order_status: string;
  provider: string;
  method: string;
  amount: number;
  payment_url: string | null;
  transaction_id: string | null;
  response_code: string | null;
  paid_at: string | null;
}

/** Response from `GET /payments/config`. */
export interface PaymentConfig {
  provider: string;
  configured: boolean;
  methods: PaymentMethod[];
  channels: string[];
  allow_simulate: boolean;
}
