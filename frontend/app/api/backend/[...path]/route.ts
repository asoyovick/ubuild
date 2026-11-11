import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return proxy(request);
}

export async function POST(request: Request) {
  return proxy(request);
}

export async function PUT(request: Request) {
  return proxy(request);
}

export async function PATCH(request: Request) {
  return proxy(request);
}

export async function DELETE(request: Request) {
  return proxy(request);
}

async function proxy(request: Request) {
  const backend = process.env.UBUILD_API_URL ?? "http://localhost:8080";
  if (!backend || backend.startsWith("http://localhost")) {
    return NextResponse.json(
      { error: "UBUILD_API_URL is not configured for production." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const path = url.pathname.slice("/api/backend".length) || "/";

  // Only proxy clean API paths. Rejecting traversal segments here prevents the
  // catch-all route from being used to reach non-API endpoints on the backend.
  if (
    path.includes("..") ||
    path.includes("//") ||
    path.includes("\\") ||
    !/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(path)
  ) {
    return NextResponse.json({ error: "Invalid API path." }, { status: 400 });
  }

  try {
    const backendURL = new URL(`${backend}/api${path}`);
    if (!backendURL.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid API path." }, { status: 400 });
    }

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("transfer-encoding");

    const response = await fetch(backendURL.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend proxy error:", error);
    return NextResponse.json(
      { error: "The UBuild API is unavailable." },
      { status: 502 },
    );
  }
}
