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
  const backendPath = path.startsWith("/") ? path : `/${path}`;

  try {
    const backendURL = new URL(`${backend}/api${backendPath}`);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("connection");

    const cookies = headers.get("cookie");
    if (cookies) {
      headers.set("cookie", cookies);
    }

    const response = await fetch(backendURL.toString(), {
      method: request.method,
      headers,
      body: request.body,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-length");

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
