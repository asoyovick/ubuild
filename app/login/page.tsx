"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [serverError, setServerError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrors({});
    setServerError("");

    const localErrors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      localErrors.email = "Please enter a valid email address.";
    }
    if (!password) {
      localErrors.password = "Please enter your password.";
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setStatus("idle");
      return;
    }

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
    } catch {
      setStatus("error");
      setServerError("We couldn't reach the server. Check your connection and try again.");
      return;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus("error");
      if (data.errors) {
        setErrors(data.errors);
      } else {
        setServerError(
          data.error ?? "Something went wrong. Please try again.",
        );
      }
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputClass = (field: string) =>
    `w-full rounded-md border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:ring-red-200"
        : "border-navy/20 focus:border-primary focus:ring-primary-light"
    }`;

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in"
      subtitle={
        <>
          New to UBuild?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
            />
            {errors.email && (
              <p id="login-email-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-ink">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
            />
            {errors.password && (
              <p id="login-password-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.password}
              </p>
            )}
          </div>
        </div>

        {status === "error" && serverError && (
          <p role="alert" className="mt-5 flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={status === "submitting"} className="mt-7 w-full">
          {status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
