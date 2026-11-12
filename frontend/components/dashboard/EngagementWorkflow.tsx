"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";
import {
  PROJECT_STAGES,
  formatCents,
  formatMoment,
  stageLabel,
  type Engagement,
  type EngagementVariation,
  type Professional,
} from "@/lib/ubuild-shared";

export type EngagementWithVariations = Engagement & { variations: EngagementVariation[] };

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  REQUESTED: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-800",
};

function Status({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[value] ?? "bg-navy/10 text-navy"}`}>
      {value.toLowerCase()}
    </span>
  );
}

export function EngagementWorkflow({
  projectId,
  role,
  userId,
  engagements,
  professionals,
  defaultStage,
}: {
  projectId: string;
  role: string;
  userId: string;
  engagements: EngagementWithVariations[];
  professionals: Professional[];
  defaultStage?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const isClient = role === "OWNER";
  const nameOf = (professionalId: string) =>
    professionals.find((professional) => professional.userId === professionalId)?.name ?? professionalId;

  async function run(key: string, path: string, method: "POST" | "PUT", body?: unknown) {
    setBusy(key);
    setError("");
    const result = await workspaceRequest(path, method, body);
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function createEngagement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const fee = Number(values.get("fee") ?? 0);
    const done = await run("create", `projects/${projectId}/engagements`, "POST", {
      professionalId: String(values.get("professionalId") ?? ""),
      constructionStage: String(values.get("constructionStage") ?? "DESIGN"),
      scope: String(values.get("scope") ?? ""),
      deliverables: String(values.get("deliverables") ?? ""),
      timeline: String(values.get("timeline") ?? ""),
      startDate: String(values.get("startDate") ?? ""),
      endDate: String(values.get("endDate") ?? ""),
      feeCents: Math.round(fee * 100),
      currency: String(values.get("currency") ?? "KES"),
    });
    if (done) form.reset();
  }

  async function proposeVariation(engagementId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const done = await run(`variation-${engagementId}`, `projects/${projectId}/engagements/${engagementId}/variations`, "POST", {
      scope: String(values.get("scope") ?? ""),
      feeCents: Math.round(Number(values.get("fee") ?? 0) * 100),
    });
    if (done) form.reset();
  }

  async function decideVariation(variationId: string, approve: boolean) {
    let note = "";
    if (!approve) {
      note = window.prompt("Why are you rejecting this variation?") ?? "";
      if (!note.trim()) return;
    }
    await run(`decide-${variationId}`, `projects/${projectId}/variations/${variationId}/decide`, "POST", { approve, note });
  }

  async function rate(engagementId: string) {
    const score = Number(window.prompt("Rate the professional from 1 to 5", "5") ?? 0);
    if (score < 1 || score > 5) return;
    const comment = window.prompt("Optional comment") ?? "";
    await run(`rate-${engagementId}`, `projects/${projectId}/engagements/${engagementId}/ratings`, "POST", {
      score,
      comment,
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {isClient && (
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-base font-bold text-navy">Record a new engagement</h2>
          <p className="mt-1 text-sm text-ink/60">
            An engagement only becomes payable once you approve the agreed terms.
          </p>
          <form onSubmit={createEngagement} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-ink/70">
              Professional
              <select
                name="professionalId"
                required
                className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm"
              >
                <option value="">Choose a professional</option>
                {professionals.map((professional) => (
                  <option key={professional.userId} value={professional.userId}>
                    {professional.name} — {professional.headline}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink/70">
              Scope
              <textarea name="scope" required rows={2} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/70">
                Construction stage
                <select
                  name="constructionStage"
                  defaultValue={defaultStage ?? "DESIGN"}
                  className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm"
                >
                  {PROJECT_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stageLabel(stage)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Deliverables
                <input name="deliverables" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/70">
                Timeline
                <input name="timeline" required placeholder="e.g. six weeks from approval" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Agreed fee
                <input
                  name="fee"
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-ink/70">
                Start date
                <input name="startDate" type="date" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                End date
                <input name="endDate" type="date" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Currency
                <select name="currency" defaultValue="KES" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="UGX">UGX</option>
                  <option value="TZS">TZS</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={busy === "create"}
              className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
            >
              {busy === "create" ? "Recording…" : "Record engagement"}
            </button>
          </form>
        </section>
      )}

      {engagements.length === 0 ? (
        <p className="text-sm text-ink/65">No engagements have been recorded on this project yet.</p>
      ) : (
        engagements.map((engagement) => (
          <article key={engagement.id} className="rounded-xl border border-navy/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-navy">{engagement.scope}</h2>
                  <Status value={engagement.status} />
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {nameOf(engagement.professionalId)} · {stageLabel(engagement.constructionStage)} · agreed{" "}
                  {formatCents(engagement.feeCents, engagement.currency)} · {engagement.timeline}
                </p>
                {engagement.deliverables && (
                  <p className="mt-1 text-xs text-ink/55">Deliverables: {engagement.deliverables}</p>
                )}
                <p className="mt-1 text-xs text-ink/45">
                  Recorded {formatMoment(engagement.createdAt)}
                  {engagement.startDate ? ` · starts ${formatMoment(engagement.startDate)}` : ""}
                  {engagement.endDate ? ` · due ${formatMoment(engagement.endDate)}` : ""}
                  {engagement.approvedAt ? ` · approved ${formatMoment(engagement.approvedAt)}` : ""}
                  {engagement.completedAt ? ` · completed ${formatMoment(engagement.completedAt)}` : ""}
                </p>
                {engagement.opportunityId && (
                  <p className="mt-1 text-xs text-ink/45">
                    Created from an awarded marketplace opportunity.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {isClient && engagement.status === "PENDING" && (
                  <button
                    onClick={() => run(`approve-${engagement.id}`, `projects/${projectId}/engagements/${engagement.id}/approve`, "POST")}
                    disabled={busy === `approve-${engagement.id}`}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
                  >
                    Approve terms
                  </button>
                )}
                {isClient && engagement.status === "APPROVED" && (
                  <button
                    onClick={() => run(`complete-${engagement.id}`, `projects/${projectId}/engagements/${engagement.id}/complete`, "POST")}
                    disabled={busy === `complete-${engagement.id}`}
                    className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                  >
                    Mark complete
                  </button>
                )}
                {isClient && engagement.status === "COMPLETED" && (
                  <button
                    onClick={() => rate(engagement.id)}
                    disabled={busy === `rate-${engagement.id}`}
                    className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                  >
                    Rate professional
                  </button>
                )}
              </div>
            </div>

            {engagement.variations.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-navy/10 pt-3">
                {engagement.variations.map((variation) => (
                  <li key={variation.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-ink/70">
                      Variation: {variation.scope || "fee change"} ·{" "}
                      {variation.feeCents >= 0 ? "+" : ""}
                      {formatCents(variation.feeCents, variation.currency)} · <Status value={variation.status} />
                    </span>
                    {isClient && variation.status === "REQUESTED" && (
                      <span className="flex gap-2">
                        <button
                          onClick={() => decideVariation(variation.id, true)}
                          className="rounded-md bg-navy px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Approve variation
                        </button>
                        <button
                          onClick={() => decideVariation(variation.id, false)}
                          className="rounded-md border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy"
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {(isClient || engagement.professionalId === userId) && engagement.status === "APPROVED" && (
              <form onSubmit={(event) => proposeVariation(engagement.id, event)} className="mt-4 grid gap-2 border-t border-navy/10 pt-3 sm:grid-cols-[1fr_140px_auto]">
                <input
                  name="scope"
                  placeholder="Change to the agreed scope"
                  className="rounded-md border border-navy/20 px-3 py-2 text-sm"
                />
                <input
                  name="fee"
                  type="number"
                  step="0.01"
                  placeholder="Fee change (KES)"
                  className="rounded-md border border-navy/20 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy === `variation-${engagement.id}`}
                  className="rounded-md border border-navy/20 px-3 py-2 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                >
                  Propose variation
                </button>
              </form>
            )}
          </article>
        ))
      )}
    </div>
  );
}
