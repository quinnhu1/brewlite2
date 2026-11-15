"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, type UserProfile } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import OrderList from "@/components/orders/order-list";
function AccountContent() {
  const router = useRouter(),
    params = useSearchParams();
  const selected = params.get("tab") ?? "Account";
  const [user, setUser] = useState<UserProfile | null>(null),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    authApi
      .me()
      .then((u) => {
        if (live) {
          setUser(u);
          setName(u.name);
          setPhone(u.phone);
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401)
          router.replace("/signin?next=%2Faccount");
        else if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [router]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const u = await authApi.profile({
        name,
        phone,
        ...(password ? { password } : {}),
      });
      setUser(u);
      setPassword("");
      setStatus("Cập nhật thông tin thành công.");
      localStorage.setItem("user", JSON.stringify(u));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }
  if (!user)
    return (
      <main className="pt-40 text-center">
        {error || "Đang tải tài khoản..."}
      </main>
    );
  return (
    <main className="account-shell">
      <aside className="account-sidebar">
        <div className="flex items-center gap-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#b79c87] bg-white text-3xl">
            {user.name[0]?.toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <p>point: {user.point}</p>
            <p className="text-sm">
              {user.role === "admin" ? "Administrator" : "Member"}
            </p>
          </div>
        </div>
        <nav>
          {["Account", "Order Tracking", "Order History"].map((t) => (
            <button
              key={t}
              className={selected === t ? "active" : ""}
              onClick={() =>
                router.replace("/account?tab=" + encodeURIComponent(t))
              }
            >
              {t}
            </button>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" className="mt-8 text-center underline">
              Open Admin Portal
            </Link>
          )}
        </nav>
      </aside>
      <section className="account-content">
        {selected === "Account" ? (
          <>
            <h2>Account Details</h2>
            <form className="account-fields" onSubmit={save}>
              <label>
                Name
                <input
                  value={name}
                  required
                  maxLength={50}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Phone number
                <input
                  value={phone}
                  required
                  pattern="0[0-9]{9}"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                Email
                <input value={user.email} disabled />
              </label>
              <label>
                New password (để trống nếu giữ nguyên)
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {status && (
                <p role="status" className="form-status">
                  {status}
                </p>
              )}
              <div className="account-buttons">
                <button className="coffee-button" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="coffee-button"
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    router.push("/signin");
                  }}
                >
                  Log out
                </button>
              </div>
            </form>
          </>
        ) : (
          <OrderList key={selected} tracking={selected === "Order Tracking"} />
        )}
      </section>
    </main>
  );
}
export default function AccountPage() {
  return (
    <Suspense fallback={<p className="pt-40 text-center">Đang tải...</p>}>
      <AccountContent />
    </Suspense>
  );
}
