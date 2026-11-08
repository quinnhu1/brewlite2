"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthInput from "@/components/account/input";
import { authApi } from "@/lib/api/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      await authApi.register({ email, name, phone, password });

      // Chỉ chuyển trang khi API xác nhận đã tạo tài khoản thành công.
      router.replace("/signin?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký không thành công, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[740px] flex-col gap-6 px-6 pt-[150px] pb-16">
      <h1 className="text-[28px] font-bold">Sign up</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p role="alert" className="text-sm font-medium text-red-500">{error}</p>}

        <AuthInput label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <AuthInput label="Full name" name="name" placeholder="Your full name" required autoComplete="name" />
        <AuthInput label="Phone number" name="phone" type="tel" placeholder="0901234567" required autoComplete="tel" />
        <AuthInput label="Password (at least 6 characters)" name="password" type="password" placeholder="Create a password" required minLength={6} autoComplete="new-password" />

        <button
          type="submit"
          disabled={loading}
          className="mx-auto mt-2 w-[380px] max-w-full rounded-full bg-[#2b140e] py-4 text-xl font-semibold text-white transition disabled:opacity-50"
        >
          {loading ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm">
        You have an account?{" "}
        <Link href="/signin" className="font-bold">Sign in</Link>
      </p>
    </main>
  );
}
