"use client";
import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearLocalSession, SESSION_EVENT } from "@/lib/session";
export default function CartHydration() {
  useEffect(() => {
    let live = true;
    async function sync() {
      await useCartStore.persist.rehydrate();
      if (!live) return;
      const token = localStorage.getItem("token");
      if (!token) {
        if (useCartStore.getState().ownerUserId) useCartStore.getState().clearSession();
        return;
      }
      try {
        const user = await authApi.me();
        if (live && token === localStorage.getItem("token"))
          useCartStore.getState().bindUser(user.user_id);
      } catch (e) {
        if (live && token === localStorage.getItem("token") && e instanceof ApiError && e.status === 401)
          clearLocalSession();
      }
    }
    const change = () => { void sync(); };
    const storage = (event: StorageEvent) => {
      if (event.key === "token" && event.oldValue !== event.newValue) window.location.reload();
    };
    change();
    window.addEventListener(SESSION_EVENT, change);
    window.addEventListener("storage", storage);
    return () => {
      live = false;
      window.removeEventListener(SESSION_EVENT, change);
      window.removeEventListener("storage", storage);
    };
  }, []);
  return null;
}
