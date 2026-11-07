const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/backend";

export interface ClientResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
}

function firstError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.error === "string" && record.error) return record.error;
  if (record.errors && typeof record.errors === "object") {
    const value = Object.values(record.errors as Record<string, unknown>)[0];
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

export async function workspaceRequest<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ClientResult<T>> {
  try {
    const isForm = body instanceof FormData;
    const response = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
      method,
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: firstError(data, "We couldn't save that. Please try again."),
      };
    }
    return { ok: true, status: response.status, data: data as T, error: "" };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "We couldn't reach the server. Please try again.",
    };
  }
}

export function formatMoney(cents: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function label(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}
