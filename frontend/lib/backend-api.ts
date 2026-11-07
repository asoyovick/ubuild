import { cookies } from "next/headers";

const apiURL = process.env.UBUILD_API_URL ?? "http://localhost:8080";

export async function backendFetch(path: string, init: RequestInit = {}) {
  const cookieHeader = (await cookies()).toString();
  return fetch(`${apiURL}/api/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      ...init.headers,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });
}

export interface BackendResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.error === "string" && record.error) return record.error;
  if (record.errors && typeof record.errors === "object") {
    const first = Object.values(record.errors as Record<string, unknown>)[0];
    if (typeof first === "string" && first) return first;
  }
  return fallback;
}

/**
 * Server-side request helper that keeps the HTTP status and error message so
 * pages can render accurate loading, empty, and failure states.
 */
export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<BackendResult<T>> {
  try {
    const response = await backendFetch(path, init);
    let body: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: messageFromBody(body, "The server could not complete this request."),
      };
    }
    return { ok: true, status: response.status, data: body as T, error: "" };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "We couldn't reach the UBuild API. Please try again.",
    };
  }
}

export async function backendJSON<T>(path: string): Promise<T | null> {
  const result = await backendRequest<T>(path);
  return result.ok ? result.data : null;
}
