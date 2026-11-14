const DEFAULT_API_URL = "http://localhost:3001";

/** Base URL of the NestJS API, without a trailing slash. */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, "");

interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

/** HTTP error raised by {@link apiRequest}; `status` mirrors the response code. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function resolveUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function readToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function messageFrom(data: unknown, status: number) {
  if (data && typeof data === "object" && "message" in data) {
    const { message } = data as ApiErrorBody;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.trim()) return message;
  }
  return `Yêu cầu thất bại (HTTP ${status}).`;
}

/**
 * Fetch JSON from the API, attaching the stored bearer token when present.
 * Throws {@link ApiError} for non-2xx responses.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = readToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(resolveUrl(path), { ...init, headers });
  const text = await response.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageFrom(data, response.status),
      data,
    );
  }

  return data as T;
}
