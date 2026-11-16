"use client";
import { useState } from "react";
import type { PaymentBody } from "@/lib/api/payments";

export type VnpayChannel = NonNullable<PaymentBody["bank_code"]>;

export default function VnpayChoices({ value, onChange, disabled = false }: {
  value: VnpayChannel;
  onChange: (value: VnpayChannel) => void;
  disabled?: boolean;
}) {
  const [lastCard, setLastCard] = useState<"VNBANK" | "INTCARD">("VNBANK");
  const card = value === "VNPAYQR" ? lastCard : value;
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="mb-3 font-bold">Phương thức thanh toán</legend>
      <div className="payment-choices">
        <label className={`payment-choice ${value === "VNPAYQR" ? "selected" : ""}`}>
          <input type="radio" name="vnpay-channel" checked={value === "VNPAYQR"}
            onChange={() => onChange("VNPAYQR")} />
          VNPay QR (Sandbox)
        </label>
        <label className={`payment-choice ${value !== "VNPAYQR" ? "selected" : ""}`}>
          <input type="radio" name="vnpay-channel" checked={value !== "VNPAYQR"}
            onChange={() => onChange(card)} />
          Thẻ ngân hàng
        </label>
      </div>
      {value !== "VNPAYQR" && (
        <label className="block text-sm">Loại thẻ
          <select className="ml-3 rounded border p-2" value={card} onChange={(event) => {
            const next = event.target.value === "INTCARD" ? "INTCARD" : "VNBANK";
            setLastCard(next);
            onChange(next);
          }}>
            <option value="VNBANK">ATM / tài khoản nội địa</option>
            <option value="INTCARD">Thẻ quốc tế</option>
          </select>
        </label>
      )}
      <p className="text-sm">
        {value === "VNPAYQR"
          ? "QR thử nghiệm cần merchant và phương tiện test được VNPay hỗ trợ. Nếu app ngân hàng báo mã không hợp lệ, hãy chọn Thẻ ngân hàng để test."
          : "Thanh toán trên VNPay Sandbox bằng thẻ test do VNPay cung cấp. Không nhập thẻ ngân hàng thật."}
      </p>
    </fieldset>
  );
}
