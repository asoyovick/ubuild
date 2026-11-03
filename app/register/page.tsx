"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { PROJECT_ROLES, PROJECT_ROLE_LABELS, type ProjectRole } from "@/lib/projects/types";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (!role || !PROJECT_ROLES.includes(role)) {
      localErrors.role = "Choose a role from the list.";
    }
    if (password.length < 8) {
      localErrors.password = "Choose a password of at least 8 characters.";
    }
    if (!confirmPassword) {
      localErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      localErrors.confirmPassword = "The passwords do not match.";
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
          role,
          password,
          confirmPassword,
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
              name="name"
              type="text"
              autoComplete="name"
              required
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
              Email address
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
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
            <label htmlFor="register-role" className="mb-1.5 block text-sm font-semibold text-ink">
              Role
            </label>
            <select
              id="register-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectRole | "")}
              className={inputClass("role")}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? "register-role-error" : undefined}
              required
            >
              <option value="">Select your role</option>
              {PROJECT_ROLES.map((option) => (
                <option key={option} value={option}>{PROJECT_ROLE_LABELS[option]}</option>
              ))}
            </select>
            {errors.role && (
              <p id="register-role-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.role}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass("password")} pr-12`}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : "register-password-hint"}
                required
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/55 hover:text-navy">
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
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

          <div>
            <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-semibold text-ink">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputClass("confirmPassword")} pr-12`}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
                required
              />
              <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/55 hover:text-navy">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="register-confirm-password-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {errors.confirmPassword}
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
          Create an account to manage your project workspace and team access.
        </p>
      </form>
    </AuthLayout>
  );
}
