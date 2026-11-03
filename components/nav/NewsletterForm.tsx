"use client";

import { useState, type FormEvent } from "react";

export function NewsletterForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
      });
      const result = await response.json();
      setMessage(response.ok ? "Your email address has been recorded." : result.errors?.email ?? "We couldn't record your email. Please try again.");
      if (response.ok) form.reset();
    } catch {
      setMessage("We couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6" onSubmit={handleSubmit} aria-label="Newsletter subscription">
      <h3 className="text-sm font-bold tracking-widest text-white uppercase">Project insights</h3>
      <p className="mt-3 text-xs leading-relaxed text-white/55">Occasional notes on planning and managing builds remotely.</p>
      <div className="mt-3 flex overflow-hidden rounded-md bg-white/10 focus-within:ring-2 focus-within:ring-accent">
        <label htmlFor="footer-email" className="sr-only">Email address</label>
        <input id="footer-email" name="email" type="email" autoComplete="email" required placeholder="Your email" className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none" />
        <button type="submit" disabled={submitting} className="shrink-0 bg-accent px-4 text-sm font-bold text-ink transition-colors hover:bg-accent-dark disabled:opacity-60">
          {submitting ? "Joining…" : "Join"}
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-white/75" role="status" aria-live="polite">{message}</p>}
    </form>
  );
}
