import type { UserProfile } from "./api/auth";
import { useCartStore } from "@/store/useCartStore";

export const SESSION_EVENT = "brewlite-session-changed";

export function saveSession(accessToken: string, user: UserProfile) {
  useCartStore.getState().bindUser(user.user_id);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", accessToken);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearLocalSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  useCartStore.getState().clearSession();
  window.dispatchEvent(new Event(SESSION_EVENT));
}
