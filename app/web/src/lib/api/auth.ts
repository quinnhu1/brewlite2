import { apiRequest } from "./client";

export type UserRole = "admin" | "staff" | "customer";

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole | string;
  point: number;
}

export interface AuthSession {
  accessToken: string;
  user: UserProfile;
}

export interface RegisterBody {
  name: string;
  email: string;
  phone: string;
  password: string;
}

function persist(session: AuthSession) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("token", session.accessToken);
    window.localStorage.setItem("user", JSON.stringify(session.user));
  }
  return session;
}

export const authApi = {
  /** Current user resolved from the stored bearer token. */
  me: () => apiRequest<UserProfile>("/auth/me"),

  login: (identifier: string, password: string) =>
    apiRequest<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }).then(persist),

  register: (body: RegisterBody) =>
    apiRequest<AuthSession>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(persist),

  /** Client-side sign out; the API does not keep a session. */
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
    }
  },
};
