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

export async function backendJSON<T>(path: string): Promise<T | null> {
  try {
    const response = await backendFetch(path);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
