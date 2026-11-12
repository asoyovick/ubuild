"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";
import { PROJECT_STAGES, stageLabel } from "@/lib/ubuild-shared";
import type { BackendProject } from "@/lib/backend-projects";

export function ProjectBriefForm({ project }: { project: BackendProject }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setMessage("");
    const result = await workspaceRequest(`projects/${project.id}`, "PATCH", {
      name: String(values.get("name") ?? ""),
      location: String(values.get("location") ?? ""),
      type: String(values.get("type") ?? ""),
      description: String(values.get("description") ?? ""),
      scope: String(values.get("scope") ?? ""),
      budgetCents: Math.round(Number(values.get("budget") ?? 0) * 100),
      currency: String(values.get("currency") ?? project.currency ?? "KES"),
      constructionStage: String(values.get("constructionStage") ?? project.constructionStage ?? "DESIGN"),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Project brief updated.");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40"
      >
        Edit project brief
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink/70">
          Project name
          <input name="name" required minLength={2} defaultValue={project.name} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Location
          <input name="location" required minLength={2} defaultValue={project.location} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Project type
          <input name="type" required minLength={2} defaultValue={project.type} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Current construction stage
          <select name="constructionStage" defaultValue={project.constructionStage || "DESIGN"} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
            {PROJECT_STAGES.map((stage) => (
              <option key={stage} value={stage}>{stageLabel(stage)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Budget
          <input name="budget" type="number" min={0} step="0.01" defaultValue={(project.budgetCents ?? 0) / 100} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Currency
          <select name="currency" defaultValue={project.currency || "KES"} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="UGX">UGX</option>
            <option value="TZS">TZS</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-ink/70">
        Scope of work
        <textarea name="scope" rows={3} defaultValue={project.scope} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
      </label>
      <label className="block text-sm font-medium text-ink/70">
        Description
        <textarea name="description" rows={2} defaultValue={project.description} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60">
          {saving ? "Saving…" : "Save brief"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-navy/20 px-4 py-2 text-sm font-semibold text-navy hover:border-navy/40">
          Cancel
        </button>
      </div>
    </form>
  );
}
