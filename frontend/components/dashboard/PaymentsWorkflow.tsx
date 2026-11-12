"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";
import { formatCents, formatMoment, type Engagement, type PaymentRequest } from "@/lib/ubuild-shared";

export function PaymentsWorkflow({
  projectId,
  role,
  userId,
  requests,
  engagements,
}: {
  projectId: string;
  role: string;
  userId: string;
  requests: PaymentRequest[];
  engagements: Engagement[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const isClient = role === "OWNER";
  const myEngagements = engagements.filter(
    (engagement) => engagement.professionalId === userId && engagement.status === "APPROVED",
  );

  async function run(key: string, path: string, body: unknown) {
    setBusy(key);
    setError("");
    const result = await workspaceRequest(path, "POST", body);
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function requestPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const done = await run("request", `projects/${projectId}/payment-requests`, {
      engagementId: String(values.get("engagementId") ?? ""),
      description: String(values.get("description") ?? ""),
      amountCents: Math.round(Number(values.get("amount") ?? 0) * 100),
      deliverableIds: String(values.get("deliverables") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (done) form.reset();
  }

  async function authorize(requestId: string) {
    const note = window.prompt("Add an instruction note for the release (optional)") ?? "";
    await run(`authorize-${requestId}`, `projects/${projectId}/payment-requests/${requestId}/authorize`, { note });
  }

  async function reject(requestId: string) {
    const note = window.prompt("Why are you rejecting this request?") ?? "";
    if (!note.trim()) return;
    await run(`reject-${requestId}`, `projects/${projectId}/payment-requests/${requestId}/reject`, { note });
  }

  async function requestRevisions(requestId: string) {
    const note = window.prompt("What needs to change before you can authorize this payment?") ?? "";
    if (!note.trim()) return;
    await run(`revisions-${requestId}`, `projects/${projectId}/payment-requests/${requestId}/revisions`, { note });
  }

  async function resubmit(requestId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const done = await run(`resubmit-${requestId}`, `projects/${projectId}/payment-requests/${requestId}/resubmit`, {
      description: String(values.get("description") ?? ""),
      amountCents: Math.round(Number(values.get("amount") ?? 0) * 100),
      deliverableIds: String(values.get("deliverables") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (done) form.reset();
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <p className="rounded-md bg-navy/5 px-3 py-2 text-sm text-ink/70">
        Authorizing a payment records your instruction. The payment is complete only when the payment provider
        confirms the transfer, and money never moves automatically.
      </p>

      {myEngagements.length > 0 && (
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="text-base font-bold text-navy">Request payment</h2>
          <p className="mt-1 text-sm text-ink/60">
            Request against an approved engagement and list the deliverables you have submitted.
          </p>
          <form onSubmit={requestPayment} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-ink/70">
              Engagement
              <select name="engagementId" required className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
                {myEngagements.map((engagement) => (
                  <option key={engagement.id} value={engagement.id}>
                    {engagement.scope} — agreed {formatCents(engagement.feeCents, engagement.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink/70">
              What have you delivered?
              <input name="description" required className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/70">
                Amount (KES)
                <input name="amount" type="number" min={1} required className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Deliverable references (comma separated)
                <input name="deliverables" required className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy === "request"}
              className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
            >
              {busy === "request" ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </section>
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-ink/65">No payment requests have been recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Deliverables</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t border-navy/10 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{request.description}</p>
                    <p className="text-xs text-ink/50">Requested {formatMoment(request.requestedAt)}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">
                    {formatCents(request.amountCents, request.currency)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">{request.deliverableIds.replaceAll(",", ", ")}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-[11px] font-semibold text-navy">
                      {request.status.toLowerCase()}
                    </span>
                    {request.providerStatus && (
                      <p className="mt-1 text-[11px] text-ink/50">Provider: {request.providerStatus.toLowerCase()}</p>
                    )}
                    {request.paidAt && <p className="text-[11px] text-ink/50">Paid {formatMoment(request.paidAt)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {request.decisionNote && <p className="mb-2 text-xs text-ink/60">{request.decisionNote}</p>}
                    {isClient && request.status === "SUBMITTED" && (
                      <span className="flex flex-wrap gap-2">
                        <button
                          onClick={() => authorize(request.id)}
                          disabled={busy === `authorize-${request.id}`}
                          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
                        >
                          Authorize payment
                        </button>
                        <button
                          onClick={() => requestRevisions(request.id)}
                          disabled={busy === `revisions-${request.id}`}
                          className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                        >
                          Request changes
                        </button>
                        <button
                          onClick={() => reject(request.id)}
                          disabled={busy === `reject-${request.id}`}
                          className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </span>
                    )}
                    {!isClient &&
                      request.professionalId === userId &&
                      request.status === "REVISIONS_REQUESTED" && (
                        <form onSubmit={(event) => resubmit(request.id, event)} className="space-y-2 rounded-md border border-navy/15 p-3">
                          <p className="text-xs font-semibold text-navy">Resubmit with the requested changes</p>
                          <input
                            name="description"
                            defaultValue={request.description}
                            required
                            placeholder="What you delivered"
                            className="w-full rounded-md border border-navy/20 px-2.5 py-1.5 text-xs"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              name="amount"
                              type="number"
                              min={1}
                              step="0.01"
                              defaultValue={request.amountCents / 100}
                              required
                              className="w-full rounded-md border border-navy/20 px-2.5 py-1.5 text-xs"
                            />
                            <input
                              name="deliverables"
                              defaultValue={request.deliverableIds}
                              required
                              placeholder="Deliverable references"
                              className="w-full rounded-md border border-navy/20 px-2.5 py-1.5 text-xs"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={busy === `resubmit-${request.id}`}
                            className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
                          >
                            Resubmit request
                          </button>
                        </form>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
