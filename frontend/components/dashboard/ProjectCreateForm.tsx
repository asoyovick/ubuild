"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PROJECT_STAGES, stageLabel } from "@/lib/ubuild-shared";

export function ProjectCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/backend"}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(values.get("name") ?? ""),
          location: String(values.get("location") ?? ""),
          type: String(values.get("type") ?? ""),
          description: String(values.get("description") ?? ""),
          scope: String(values.get("scope") ?? ""),
          budgetCents: Math.round(Number(values.get("budget") ?? 0) * 100),
          currency: String(values.get("currency") ?? "KES"),
          constructionStage: String(values.get("constructionStage") ?? "DESIGN"),
        }),
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
        <label className="text-sm font-medium text-ink">
          Current construction stage
          <select name="constructionStage" defaultValue="DESIGN" className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light">
            {PROJECT_STAGES.map((stage) => (
              <option key={stage} value={stage}>{stageLabel(stage)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          Budget
          <input name="budget" type="number" min={0} step="0.01" placeholder="0" className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
        </label>
        <label className="text-sm font-medium text-ink">
          Currency
          <select name="currency" defaultValue="KES" className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light">
            <option value="KES">KES — Kenyan shilling</option>
            <option value="USD">USD — US dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Pound sterling</option>
            <option value="UGX">UGX — Ugandan shilling</option>
            <option value="TZS">TZS — Tanzanian shilling</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink sm:col-span-2">
          Scope of work
          <textarea name="scope" rows={2} placeholder="What the project includes and what you need help with" className="mt-1 block w-full rounded border border-navy/20 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
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
