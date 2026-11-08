import { apiRequest } from "./client";
export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  point: number;
  role: string;
}
export const authApi = {
  me: () => apiRequest<UserProfile>("/auth/me"),
  login: (identifier: string, password: string) =>
    apiRequest<{ accessToken: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }),
  register: (body: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) =>
    apiRequest<UserProfile>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  profile: (body: { name: string; phone: string; password?: string }) =>
    apiRequest<UserProfile>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
