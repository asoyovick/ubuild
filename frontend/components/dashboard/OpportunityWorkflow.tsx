"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";
import {
  PROJECT_STAGES,
  formatCents,
  formatMoment,
  stageLabel,
  type Opportunity,
  type OpportunityApplication,
  type Recommendation,
} from "@/lib/ubuild-shared";
import type { BackendProject } from "@/lib/backend-projects";

export type OpportunityWithApplications = Opportunity & {
  applications: OpportunityApplication[];
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  AWARDED: "bg-green-100 text-green-800",
  CLOSED: "bg-navy/10 text-navy",
  SUBMITTED: "bg-amber-100 text-amber-800",
  SHORTLISTED: "bg-blue-100 text-blue-800",
  SELECTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WITHDRAWN: "bg-navy/10 text-navy",
};

function Status({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[value] ?? "bg-navy/10 text-navy"}`}>
      {value.toLowerCase()}
    </span>
  );
}

export function OpportunityWorkflow({
  project,
  role,
  opportunities,
  recommendations,
}: {
  project: BackendProject;
  role: string;
  opportunities: OpportunityWithApplications[];
  recommendations: Recommendation[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const isClient = role === "OWNER";

  async function run(key: string, path: string, body?: unknown) {
    setBusy(key);
    setError("");
    setNotice("");
    const result = await workspaceRequest(path, "POST", body);
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const done = await run("publish", `projects/${project.id}/opportunities`, {
      title: String(values.get("title") ?? ""),
      constructionStage: String(values.get("constructionStage") ?? "DESIGN"),
      scope: String(values.get("scope") ?? ""),
      deliverables: String(values.get("deliverables") ?? ""),
      budgetCents: Math.round(Number(values.get("budget") ?? 0) * 100),
      currency: String(values.get("currency") ?? project.currency ?? "KES"),
      location: String(values.get("location") ?? project.location),
      deadline: String(values.get("deadline") ?? ""),
    });
    if (done) {
      form.reset();
      setNotice("Opportunity published. Professionals can now apply.");
    }
  }

  async function decide(applicationId: string, status: "SHORTLISTED" | "REJECTED") {
    const done = await run(`${status}-${applicationId}`, `projects/${project.id}/applications/${applicationId}/decide`, { status });
    if (done) setNotice(status === "SHORTLISTED" ? "Application shortlisted." : "Application rejected.");
  }

  async function select(applicationId: string) {
    if (!window.confirm("Award this opportunity? This proposes an engagement that you must still approve before any payment request is possible.")) {
      return;
    }
    const done = await run(`select-${applicationId}`, `projects/${project.id}/applications/${applicationId}/select`);
    if (done) setNotice("Application selected. The proposed engagement now awaits your terms approval.");
  }

  async function close(opportunityId: string) {
    if (!window.confirm("Close this opportunity without awarding it? Remaining applications will be rejected.")) return;
    const done = await run(`close-${opportunityId}`, `projects/${project.id}/opportunities/${opportunityId}/close`);
    if (done) setNotice("Opportunity closed.");
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}

      {isClient && (
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-base font-bold text-navy">Publish an opportunity</h2>
          <p className="mt-1 text-sm text-ink/60">
            Describe the stage and scope you need. Publishing does not create an engagement, and no
            professional is engaged until you approve agreed terms.
          </p>
          <form onSubmit={publish} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/70">
                Title
                <input name="title" required placeholder="Foundation package" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Construction stage
                <select name="constructionStage" defaultValue={project.constructionStage || "DESIGN"} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
                  {PROJECT_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stageLabel(stage)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-ink/70">
              Scope
              <textarea name="scope" required rows={2} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-ink/70">
              Deliverables
              <input name="deliverables" placeholder="What the professional must hand over" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-ink/70">
                Budget
                <input name="budget" type="number" min={0} step="0.01" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
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
              <label className="block text-sm font-medium text-ink/70">
                Application deadline
                <input name="deadline" type="date" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="block text-sm font-medium text-ink/70">
              Location
              <input name="location" defaultValue={project.location} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <button type="submit" disabled={busy === "publish"} className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60">
              {busy === "publish" ? "Publishing…" : "Publish opportunity"}
            </button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-base font-bold text-navy">Published opportunities</h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-ink/65">
            {isClient
              ? "No opportunities have been published on this project yet."
              : "This project has no published opportunities."}
          </p>
        ) : (
          opportunities.map((opportunity) => (
            <article key={opportunity.id} className="rounded-xl border border-navy/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{opportunity.title}</h3>
                    <Status value={opportunity.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink/60">
                    {stageLabel(opportunity.constructionStage)} · {opportunity.location || project.location} ·{" "}
                    {formatCents(opportunity.budgetCents, opportunity.currency)}
                    {opportunity.deadline ? ` · apply by ${formatMoment(opportunity.deadline)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink/55">{opportunity.scope}</p>
                  {opportunity.deliverables && (
                    <p className="mt-1 text-xs text-ink/45">Deliverables: {opportunity.deliverables}</p>
                  )}
                  <p className="mt-1 text-xs text-ink/45">
                    {opportunity.applicationCount} application{opportunity.applicationCount === 1 ? "" : "s"} · published{" "}
                    {formatMoment(opportunity.createdAt)}
                  </p>
                </div>
                {isClient && opportunity.status === "OPEN" && (
                  <button
                    onClick={() => close(opportunity.id)}
                    disabled={busy === `close-${opportunity.id}`}
                    className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                  >
                    Close opportunity
                  </button>
                )}
              </div>

              {opportunity.applications.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-navy/10 pt-3">
                  {opportunity.applications.map((application) => (
                    <li key={application.id} className="rounded-lg border border-navy/10 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-navy">
                            {application.professionalName || application.professionalId} ·{" "}
                            {formatCents(application.proposedFeeCents, application.currency)}
                          </p>
                          <p className="mt-0.5 text-xs text-ink/60">{application.message}</p>
                          {application.availabilityNote && (
                            <p className="mt-0.5 text-xs text-ink/45">Availability: {application.availabilityNote}</p>
                          )}
                          <p className="mt-1 text-xs text-ink/45">Applied {formatMoment(application.createdAt)}</p>
                        </div>
                        <Status value={application.status} />
                      </div>
                      {isClient &&
                        opportunity.status === "OPEN" &&
                        (application.status === "SUBMITTED" || application.status === "SHORTLISTED") && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {application.status === "SUBMITTED" && (
                              <button
                                onClick={() => decide(application.id, "SHORTLISTED")}
                                disabled={busy === `SHORTLISTED-${application.id}`}
                                className="rounded-md border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                              >
                                Shortlist
                              </button>
                            )}
                            <button
                              onClick={() => select(application.id)}
                              disabled={busy === `select-${application.id}`}
                              className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
                            >
                              Select and propose engagement
                            </button>
                            <button
                              onClick={() => decide(application.id, "REJECTED")}
                              disabled={busy === `REJECTED-${application.id}`}
                              className="rounded-md border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-base font-bold text-navy">Suggested professionals</h2>
        <p className="mt-1 text-xs text-ink/55">
          Ranking only. A recommendation never approves an engagement and never releases funds.
        </p>
        {recommendations.length === 0 ? (
          <p className="mt-3 text-sm text-ink/65">
            No professionals match this project&rsquo;s current stage and scope yet. Publish an opportunity to
            reach the marketplace.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recommendations.map((recommendation, index) => (
              <li key={recommendation.professional.userId} className="rounded-lg border border-navy/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-navy">
                    {index + 1}. {recommendation.professional.name}
                  </h3>
                  <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
                    {recommendation.score.toFixed(1)} match
                  </span>
                </div>
                <p className="text-sm text-ink/65">{recommendation.professional.headline}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-ink/55">
                  {recommendation.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
