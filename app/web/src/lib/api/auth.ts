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

export interface UpdateProfileBody {
  name?: string;
  phone?: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileBody extends UpdateProfileBody {
  /** New password; when present `currentPassword` is required too. */
  password?: string;
  currentPassword?: string;
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

  /**
   * Updates the profile and, when a new password is supplied, rotates it.
   * The API invalidates every old token, so the freshly issued one is stored.
   */
  profile: async (body: ProfileBody) => {
    const { password, currentPassword, ...fields } = body;
    let user = await apiRequest<UserProfile>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(fields),
    });

    if (password) {
      const session = await apiRequest<AuthSession>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: currentPassword ?? "",
          newPassword: password,
        }),
      });
      persist(session);
      user = session.user;
    } else if (typeof window !== "undefined") {
      window.localStorage.setItem("user", JSON.stringify(user));
    }

    return user;
  },

  /** Client-side sign out; the API does not keep a session. */
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
    }
  },
};
