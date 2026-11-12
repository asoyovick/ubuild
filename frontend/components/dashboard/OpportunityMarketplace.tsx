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
} from "@/lib/ubuild-shared";

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

export function OpportunityMarketplace({
  opportunities,
  myApplications,
  stage,
  query,
}: {
  opportunities: Opportunity[];
  myApplications: OpportunityApplication[];
  stage: string;
  query: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [openId, setOpenId] = useState("");

  const applicationFor = (opportunityId: string) =>
    myApplications.find((application) => application.opportunityId === opportunityId);

  async function apply(opportunityId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(`apply-${opportunityId}`);
    setError("");
    setNotice("");
    const result = await workspaceRequest(`opportunities/${opportunityId}/applications`, "POST", {
      message: String(values.get("message") ?? ""),
      proposedFeeCents: Math.round(Number(values.get("fee") ?? 0) * 100),
      availabilityNote: String(values.get("availability") ?? ""),
    });
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpenId("");
    setNotice("Application submitted. The client will review it and may propose an engagement.");
    router.refresh();
  }

  async function withdraw(application: OpportunityApplication) {
    if (!window.confirm("Withdraw this application?")) return;
    setBusy(`withdraw-${application.id}`);
    setError("");
    setNotice("");
    const result = await workspaceRequest(`projects/${application.projectId}/applications/${application.id}/withdraw`, "POST");
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Application withdrawn.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}

      <form method="get" action="/dashboard/opportunities" className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
        <label className="text-sm font-medium text-ink/70">
          Construction stage
          <select name="stage" defaultValue={stage} className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink">
            <option value="">All stages</option>
            {PROJECT_STAGES.map((item) => (
              <option key={item} value={item}>{stageLabel(item)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink/70">
          Search
          <input
            name="q"
            defaultValue={query}
            placeholder="Foundation, Nairobi, three-bedroom…"
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <button type="submit" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-deep">
          Filter opportunities
        </button>
      </form>

      <section className="space-y-4">
        {opportunities.length === 0 ? (
          <p className="text-sm text-ink/65">No open opportunities match this filter yet.</p>
        ) : (
          opportunities.map((opportunity) => {
            const application = applicationFor(opportunity.id);
            return (
              <article key={opportunity.id} className="rounded-xl border border-navy/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-navy">{opportunity.title}</h2>
                      <Status value={opportunity.status} />
                      {application && <Status value={application.status} />}
                    </div>
                    <p className="mt-1 text-sm text-ink/60">
                      {opportunity.projectName || "Project"} · {stageLabel(opportunity.constructionStage)} ·{" "}
                      {opportunity.location || "Location not stated"} ·{" "}
                      {formatCents(opportunity.budgetCents, opportunity.currency)}
                    </p>
                    <p className="mt-1 text-xs text-ink/55">{opportunity.scope}</p>
                    {opportunity.deliverables && (
                      <p className="mt-1 text-xs text-ink/45">Deliverables: {opportunity.deliverables}</p>
                    )}
                    <p className="mt-1 text-xs text-ink/45">
                      {opportunity.applicationCount} applicant{opportunity.applicationCount === 1 ? "" : "s"}
                      {opportunity.deadline ? ` · apply by ${formatMoment(opportunity.deadline)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!application && opportunity.status === "OPEN" && (
                      <button
                        onClick={() => setOpenId(openId === opportunity.id ? "" : opportunity.id)}
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent-dark"
                      >
                        {openId === opportunity.id ? "Cancel" : "Apply"}
                      </button>
                    )}
                    {application && (application.status === "SUBMITTED" || application.status === "SHORTLISTED") && (
                      <button
                        onClick={() => withdraw(application)}
                        disabled={busy === `withdraw-${application.id}`}
                        className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                      >
                        Withdraw application
                      </button>
                    )}
                  </div>
                </div>

                {application && (
                  <p className="mt-3 rounded-md bg-navy/5 px-3 py-2 text-xs text-ink/60">
                    Your application: {application.message || "No message"} · proposed{" "}
                    {formatCents(application.proposedFeeCents, application.currency)}
                  </p>
                )}

                {openId === opportunity.id && (
                  <form onSubmit={(event) => apply(opportunity.id, event)} className="mt-3 space-y-3 border-t border-navy/10 pt-3">
                    <label className="block text-sm font-medium text-ink/70">
                      Why are you a good fit?
                      <textarea name="message" required rows={2} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-ink/70">
                        Proposed fee ({opportunity.currency})
                        <input name="fee" type="number" min={0} step="0.01" defaultValue={(opportunity.budgetCents ?? 0) / 100} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
                      </label>
                      <label className="block text-sm font-medium text-ink/70">
                        Availability
                        <input name="availability" placeholder="Available from next week" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={busy === `apply-${opportunity.id}`}
                      className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
                    >
                      {busy === `apply-${opportunity.id}` ? "Submitting…" : "Submit application"}
                    </button>
                  </form>
                )}
              </article>
            );
          })
        )}
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="text-base font-bold text-navy">My applications</h2>
        <p className="mt-1 text-xs text-ink/55">
          An application is not an engagement and creates no payment rights.
        </p>
        {myApplications.length === 0 ? (
          <p className="mt-3 text-sm text-ink/65">You have not applied to any opportunity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy/10">
            {myApplications.map((application) => (
              <li key={application.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-navy">
                    Proposed {formatCents(application.proposedFeeCents, application.currency)}
                  </p>
                  <p className="text-xs text-ink/55">
                    {application.message || "No message"} · applied {formatMoment(application.createdAt)}
                  </p>
                </div>
                <Status value={application.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
