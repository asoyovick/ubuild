"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
    if (name.trim().length < 2) {
      localErrors.name = "Please enter your full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      localErrors.email = "Please enter a valid email address.";
    }
    if (password.length < 8) {
      localErrors.password = "Choose a password of at least 8 characters.";
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setStatus("idle");
      return;
    }

    let response: Response;
    try {
      response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
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
        setServerError(data.error ?? "Something went wrong. Please try again.");
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
      eyebrow="Get started"
      title="Create your account"
      subtitle={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold text-ink">
              Full name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "register-name-error" : undefined}
            />
            {errors.name && (
              <p id="register-name-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
            />
            {errors.email && (
              <p id="register-email-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-ink">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "register-password-error" : "register-password-hint"}
            />
            <p id="register-password-hint" className="mt-1.5 text-xs text-ink/50">
              At least 8 characters.
            </p>
            {errors.password && (
              <p id="register-password-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="mt-4 text-center text-xs text-ink/50">
          By creating an account you can track projects, budgets, and approvals.
        </p>
      </form>
    </AuthLayout>
  );
}
