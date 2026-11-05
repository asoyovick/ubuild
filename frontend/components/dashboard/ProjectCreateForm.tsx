"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ProjectCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/backend"}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(Object.values(result.errors ?? {})[0] as string ?? result.error ?? "We couldn't create the project. Check the details and try again.");
        return;
      }
      router.push(`/dashboard/projects/${result.project.id}`);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="group border-y border-navy/15 py-4">
      <summary className="cursor-pointer list-none font-semibold text-navy marker:hidden">
        Start a project
        <span className="float-right text-xl leading-none text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Project name
          <input name="name" required minLength={2} className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
        </label>
        <label className="text-sm font-medium text-ink">
          Location
          <input name="location" required minLength={2} placeholder="Town or county" className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal placeholder:text-ink/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
        </label>
        <label className="text-sm font-medium text-ink">
          Project type
          <select name="type" required defaultValue="" className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light">
            <option value="" disabled>Select type</option>
            <option>New build</option>
            <option>Renovation</option>
            <option>Extension</option>
            <option>Commercial</option>
            <option>Other</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink sm:col-span-2">
          Description <span className="font-normal text-ink/50">(optional)</span>
          <textarea name="description" rows={3} className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
        </label>
        {error && <p className="text-sm text-red-700 sm:col-span-2" role="alert">{error}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60">
            {saving ? "Creating project…" : "Create project"}
          </button>
        </div>
      </form>
    </details>
  );
}
