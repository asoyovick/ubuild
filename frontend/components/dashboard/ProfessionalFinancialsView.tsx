import { formatCents, formatMoment, stageLabel, type ProfessionalFinancials } from "@/lib/ubuild-shared";

function Status({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-[11px] font-semibold text-navy">
      {value.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}

export function ProfessionalFinancialsView({ financials }: { financials: ProfessionalFinancials }) {
  const currency = financials.engagements[0]?.currency ?? "KES";

  return (
    <div className="space-y-6">
      <p className="rounded-md bg-navy/5 px-3 py-2 text-xs leading-relaxed text-ink/65">
        This view shows only your own engagements, requests and releases on this project. The project-wide
        ledger and the client&rsquo;s other financial records are not visible to you. A payment is complete only
        when the payment provider confirms the transfer.
      </p>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Agreed total</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatCents(financials.agreedTotalCents, currency)}</p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Paid (provider-confirmed)</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatCents(financials.paidTotalCents, currency)}</p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Authorized, awaiting provider</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatCents(financials.pendingCents, currency)}</p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <div className="border-b border-navy/10 px-4 py-3">
          <h2 className="font-semibold text-navy">Your engagements</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Agreed fee</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {financials.engagements.map((engagement) => (
              <tr key={engagement.id} className="border-t border-navy/10">
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{engagement.scope}</p>
                  <p className="text-xs text-ink/50">
                    {engagement.timeline}
                    {engagement.approvedAt ? ` · approved ${formatMoment(engagement.approvedAt)}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink/60">{stageLabel(engagement.constructionStage)}</td>
                <td className="px-4 py-3 font-semibold text-navy">
                  {formatCents(engagement.feeCents, engagement.currency)}
                </td>
                <td className="px-4 py-3"><Status value={engagement.status} /></td>
              </tr>
            ))}
            {financials.engagements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-ink/60">No engagements recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <div className="border-b border-navy/10 px-4 py-3">
          <h2 className="font-semibold text-navy">Your payment requests</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Provider</th>
            </tr>
          </thead>
          <tbody>
            {financials.paymentRequests.map((request) => (
              <tr key={request.id} className="border-t border-navy/10 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{request.description}</p>
                  <p className="text-xs text-ink/50">Requested {formatMoment(request.requestedAt)}</p>
                  {request.decisionNote && <p className="text-xs text-ink/55">{request.decisionNote}</p>}
                </td>
                <td className="px-4 py-3 font-semibold text-navy">
                  {formatCents(request.amountCents, request.currency)}
                </td>
                <td className="px-4 py-3"><Status value={request.status} /></td>
                <td className="px-4 py-3 text-xs text-ink/55">
                  {request.providerStatus ? request.providerStatus.toLowerCase() : "—"}
                  {request.paidAt ? <span className="block">Paid {formatMoment(request.paidAt)}</span> : null}
                </td>
              </tr>
            ))}
            {financials.paymentRequests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-ink/60">No payment requests recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <div className="border-b border-navy/10 px-4 py-3">
          <h2 className="font-semibold text-navy">Your releases</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider reference</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {financials.releases.map((entry) => (
              <tr key={entry.id} className="border-t border-navy/10">
                <td className="px-4 py-3 text-ink/60">{formatMoment(entry.createdAt)}</td>
                <td className="px-4 py-3 font-semibold text-navy">
                  {formatCents(entry.amountCents, entry.currency)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink/55">{entry.providerReference}</td>
                <td className="px-4 py-3"><Status value={entry.status} /></td>
              </tr>
            ))}
            {financials.releases.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-ink/60">No releases recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
