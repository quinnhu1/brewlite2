"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthInput from "@/components/account/input";
import { authApi } from "@/lib/api/auth";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const notice = searchParams.get("registered") === "1"
    ? "Đăng ký thành công! Hãy đăng nhập bằng email hoặc số điện thoại vừa đăng ký."
    : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const res = await authApi.login(identifier, password);

      // Backend hiện trả về accessToken (camelCase). Hỗ trợ thêm các tên cũ để tương thích.
      const token = res.accessToken;
      if (typeof token !== "string" || token.length === 0) {
        throw new Error("Đăng nhập phản hồi thành công nhưng không có token. Vui lòng kiểm tra API backend.");
      }

      localStorage.setItem("token", token);
      if (res.user && typeof res.user === "object") {
        localStorage.setItem("user", JSON.stringify(res.user));
      }

      const next = searchParams.get("next");
      router.replace(res.user.role === "admin" && !next ? "/admin" : next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/account");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Email/số điện thoại hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[740px] flex-col gap-6 px-6 pt-[180px] pb-16">
      <h1 className="text-[28px] font-bold">Sign in</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

        <AuthInput label="Email or phone" name="identifier" placeholder="Email or phone number" required autoComplete="username" />
        <AuthInput label="Password" name="password" type="password" required autoComplete="current-password" />

        <button
          type="submit"
          disabled={loading}
          className="mx-auto w-[380px] max-w-full rounded-full bg-[#2b140e] py-4 text-xl font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm">
        Don’t have an account?{" "}
        <Link href="/signup" className="font-bold">Sign up</Link>
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
