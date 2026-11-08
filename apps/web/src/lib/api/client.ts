export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function parseApiError(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === "object" && "message" in data) {
    const value = data.message;
    return Array.isArray(value) ? value.join("; ") : String(value);
  }
  return `Yêu cầu thất bại (HTTP ${response.status}).`;
}
export async function apiRequest<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!response.ok)
    throw new ApiError(await parseApiError(response), response.status);
  return response.json() as Promise<T>;
}
