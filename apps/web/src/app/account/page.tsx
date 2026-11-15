"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, type UserProfile } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import OrderList from "@/components/orders/order-list";
import { clearLocalSession } from "@/lib/session";

function AccountContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("tab") ?? "Account";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;

    authApi
      .me()
      .then((profile) => {
        if (live) {
          setUser(profile);
          setName(profile.name);
          setPhone(profile.phone);
        }
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          router.replace("/signin?next=%2Faccount");
        } else if (live) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không tải được thông tin tài khoản.",
          );
        }
      });

    return () => {
      live = false;
    };
  }, [router]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (password && !currentPassword.trim()) {
      setError("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.");
      return;
    }

    if (
      password &&
      (password.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)/.test(password))
    ) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ cái và chữ số.");
      return;
    }

    if (password && new TextEncoder().encode(password).byteLength > 72) {
      setError("Mật khẩu mới không được vượt quá 72 byte UTF-8.");
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await authApi.profile({
        name,
        phone,
        ...(password
          ? { password, current_password: currentPassword }
          : {}),
      });

      if (password) {
        // A successful password change increments auth_version server-side.
        // Clear the local token and cart binding before sending the user to sign in.
        clearLocalSession();
        router.replace("/signin?password_changed=1");
        return;
      }

      setUser(updatedProfile);
      setPassword("");
      setCurrentPassword("");
      setStatus("Cập nhật thông tin thành công.");
      localStorage.setItem("user", JSON.stringify(updatedProfile));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Không lưu được.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function logoutEverywhere() {
    setError("");
    setStatus("");
    setSaving(true);

    try {
      await authApi.logout();
      clearLocalSession();
      router.replace("/signin");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        // The server already considers this session invalid; remove stale local state.
        clearLocalSession();
        router.replace("/signin");
      } else {
        setError(
          "Chưa đăng xuất được trên máy chủ. Hãy kiểm tra mạng và thử lại.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="pt-40 text-center">
        {error || "Đang tải tài khoản..."}
      </main>
    );
  }

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
          {["Account", "Order Tracking", "Order History"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={selected === tab ? "active" : ""}
              onClick={() =>
                router.replace("/account?tab=" + encodeURIComponent(tab))
              }
            >
              {tab}
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
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label>
                Phone number
                <input
                  value={phone}
                  required
                  inputMode="numeric"
                  pattern="0[0-9]{9}"
                  maxLength={10}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>

              <label>
                Email
                <input value={user.email} disabled />
              </label>

              <label>
                Mật khẩu mới (ít nhất 8 ký tự, có chữ và số; tối đa 72 byte UTF-8;
                để trống nếu giữ nguyên)
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  pattern="(?=.*[A-Za-z])(?=.*\d).*"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {password && (
                <label>
                  Mật khẩu hiện tại (bắt buộc để xác nhận đổi mật khẩu)
                  <input
                    type="password"
                    autoComplete="current-password"
                    maxLength={72}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
              )}

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
                  disabled={saving}
                  onClick={logoutEverywhere}
                >
                  Đăng xuất mọi phiên
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
