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
  type FundsAccount,
  type FundsAllocation,
  type LedgerEntry,
  type ProviderAccount,
} from "@/lib/ubuild-shared";

export function FundsWorkflow({
  projectId,
  role,
  funds,
  availableCents,
  provider,
  entries,
  allocations,
  engagements,
}: {
  projectId: string;
  role: string;
  funds: FundsAccount | null;
  availableCents: number;
  provider: ProviderAccount | null;
  entries: LedgerEntry[];
  allocations: FundsAllocation[];
  engagements: Engagement[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const isClient = role === "OWNER";

  async function run(
    key: string,
    path: string,
    method: "POST" | "PUT",
    body?: unknown,
    successNotice = "Saved. Provider confirmation is still required before the ledger balance changes.",
  ) {
    setBusy(key);
    setError("");
    setNotice("");
    const result = await workspaceRequest(path, method, body);
    setBusy("");
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setNotice(successNotice);
    router.refresh();
    return true;
  }

  async function saveProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await run("provider", `projects/${projectId}/provider`, "PUT", {
      arrangement: String(values.get("arrangement") ?? "A"),
      name: String(values.get("name") ?? ""),
      displayAccount: String(values.get("displayAccount") ?? ""),
    });
  }

  async function openAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run("account", `projects/${projectId}/funds`, "POST", {
      source: String(values.get("source") ?? ""),
    });
  }

  async function deposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const done = await run("deposit", `projects/${projectId}/deposits`, "POST", {
      amountCents: Math.round(Number(values.get("amount") ?? 0) * 100),
    });
    if (done) form.reset();
  }

  async function allocate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const done = await run(
      "allocate",
      `projects/${projectId}/funds/allocate`,
      "POST",
      {
        amountCents: Math.round(Number(values.get("amount") ?? 0) * 100),
        stage: String(values.get("stage") ?? "DESIGN"),
        engagementId: String(values.get("engagementId") ?? ""),
        note: String(values.get("note") ?? ""),
      },
      "Earmark saved. No money moved; the confirmed balance is unchanged.",
    );
    if (done) form.reset();
  }

  async function cancelAllocation(allocationId: string) {
    if (!window.confirm("Remove this earmark? No money moves and the confirmed balance is unchanged.")) return;
    await run(
      `cancel-${allocationId}`,
      `projects/${projectId}/allocations/${allocationId}/cancel`,
      "POST",
      undefined,
      "Earmark released. No money moved; the confirmed balance is unchanged.",
    );
  }

  const approvedEngagements = engagements.filter(
    (engagement) => engagement.status === "APPROVED" || engagement.status === "PENDING",
  );

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Confirmed balance</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {formatCents(funds?.balanceCents ?? 0, funds?.currency ?? "KES")}
          </p>
          <p className="mt-1 text-xs text-ink/50">{funds ? funds.source : "No project funds account yet"}</p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Available to authorize</p>
          <p className="mt-1 text-2xl font-bold text-navy">{formatCents(availableCents, funds?.currency ?? "KES")}</p>
          <p className="mt-1 text-xs text-ink/50">Confirmed balance less releases awaiting provider confirmation.</p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Earmarked (planning)</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {formatCents(funds?.allocatedCents ?? 0, funds?.currency ?? "KES")}
          </p>
          <p className="mt-1 text-xs text-ink/50">Earmarks never move money; they only reserve a plan.</p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-ink/50">Payment arrangement</p>
          <p className="mt-1 text-base font-semibold text-navy">
            {provider
              ? `${provider.name} (${provider.arrangement === "A" ? "existing account" : "dedicated project account"})`
              : "Not configured"}
          </p>
          <p className="mt-1 text-xs text-ink/50">{provider?.displayAccount || "Configure a bank or mobile money provider"}</p>
        </div>
      </section>

      {provider?.disclosures && (
        <p className="rounded-md bg-navy/5 px-3 py-2 text-xs leading-relaxed text-ink/65">{provider.disclosures}</p>
      )}

      {isClient && (
        <section className="grid gap-4 lg:grid-cols-3">
          <form onSubmit={saveProvider} className="space-y-3 rounded-xl border border-navy/10 bg-white p-5">
            <h2 className="font-semibold text-navy">Payment provider</h2>
            <label className="block text-sm font-medium text-ink/70">
              Arrangement
              <select name="arrangement" defaultValue={provider?.arrangement ?? "A"} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
                <option value="A">A — my existing bank or mobile money account</option>
                <option value="B">B — dedicated project account</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-ink/70">
              Bank or provider name
              <input name="name" required defaultValue={provider?.name ?? ""} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-ink/70">
              Account label
              <input name="displayAccount" defaultValue={provider?.displayAccount ?? ""} placeholder="**** 4242" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
            </label>
            <button type="submit" disabled={busy === "provider"} className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60">
              Save arrangement
            </button>
          </form>

          {!funds ? (
            <form onSubmit={openAccount} className="space-y-3 rounded-xl border border-navy/10 bg-white p-5">
              <h2 className="font-semibold text-navy">Project funds account</h2>
              <p className="text-sm text-ink/60">Record where the project money is held.</p>
              <label className="block text-sm font-medium text-ink/70">
                Funding source
                <input name="source" required placeholder="Equity Bank **** 4242" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <button type="submit" disabled={busy === "account"} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60">
                Open funds account
              </button>
            </form>
          ) : (
            <form onSubmit={deposit} className="space-y-3 rounded-xl border border-navy/10 bg-white p-5">
              <h2 className="font-semibold text-navy">Record a deposit</h2>
              <p className="text-sm text-ink/60">
                Balances change only after the provider confirms the deposit.
              </p>
              <label className="block text-sm font-medium text-ink/70">
                Amount ({funds.currency || "KES"})
                <input name="amount" type="number" min={1} step="0.01" required className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <button type="submit" disabled={busy === "deposit"} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60">
                Record deposit
              </button>
            </form>
          )}

          {funds && (
            <form onSubmit={allocate} className="space-y-3 rounded-xl border border-navy/10 bg-white p-5">
              <h2 className="font-semibold text-navy">Earmark funds</h2>
              <p className="text-sm text-ink/60">
                An earmark is a planning record for a stage or engagement. It never moves money and is
                limited by the provider-confirmed balance.
              </p>
              <label className="block text-sm font-medium text-ink/70">
                Amount ({funds.currency || "KES"})
                <input name="amount" type="number" min={1} step="0.01" required className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Construction stage
                <select name="stage" required defaultValue={funds.constructionStage || "DESIGN"} className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
                  {PROJECT_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stageLabel(stage)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Link to an engagement <span className="font-normal text-ink/50">(optional)</span>
                <select name="engagementId" defaultValue="" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm">
                  <option value="">Stage earmark only</option>
                  {approvedEngagements.map((engagement) => (
                    <option key={engagement.id} value={engagement.id}>
                      {stageLabel(engagement.constructionStage)} — {engagement.scope}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Note <span className="font-normal text-ink/50">(optional)</span>
                <input name="note" placeholder="What this earmark covers" className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm" />
              </label>
              <button
                type="submit"
                disabled={busy === "allocate"}
                className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
              >
                Earmark funds
              </button>
            </form>
          )}
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <div className="border-b border-navy/10 px-4 py-3">
          <h2 className="font-semibold text-navy">Fund allocations</h2>
          <p className="text-xs text-ink/55">
            Plan by construction stage. Cancelling an earmark releases it without moving money.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Engagement</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              {isClient && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id} className="border-t border-navy/10">
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{stageLabel(allocation.constructionStage)}</p>
                  {allocation.note && <p className="text-xs text-ink/55">{allocation.note}</p>}
                </td>
                <td className="px-4 py-3 font-semibold text-navy">
                  {formatCents(allocation.amountCents, allocation.currency)}
                </td>
                <td className="px-4 py-3 text-xs text-ink/55">
                  {allocation.engagementId || "Stage earmark only"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-[11px] font-semibold text-navy">
                    {allocation.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink/55">{formatMoment(allocation.createdAt)}</td>
                {isClient && (
                  <td className="px-4 py-3 text-right">
                    {allocation.status === "ACTIVE" && (
                      <button
                        onClick={() => cancelAllocation(allocation.id)}
                        disabled={busy === `cancel-${allocation.id}`}
                        className="rounded-md border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:border-navy/40 disabled:opacity-60"
                      >
                        Cancel earmark
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {allocations.length === 0 && (
              <tr>
                <td colSpan={isClient ? 6 : 5} className="px-4 py-6 text-sm text-ink/60">
                  No funds have been earmarked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-navy/5 text-left text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider reference</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-navy/10">
                <td className="px-4 py-3 text-ink/60">{formatMoment(entry.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{entry.entryType.toLowerCase()}</p>
                  <p className="text-xs text-ink/55">{entry.description}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-navy">
                  {entry.direction === "CREDIT" ? "+" : "−"}
                  {formatCents(entry.amountCents, entry.currency)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink/55">{entry.providerReference}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-[11px] font-semibold text-navy">
                    {entry.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-ink/60">
                  No ledger entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
