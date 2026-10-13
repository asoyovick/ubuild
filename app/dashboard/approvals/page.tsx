"use client";

import { useState } from "react";
import {
  SAMPLE_APPROVALS,
  formatKES,
  formatDate,
  type SampleApproval,
} from "@/lib/dashboard-data";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Check, X, Inbox } from "lucide-react";

type Decision = "approved" | "declined";

export default function DashboardApprovalsPage() {
  const [approvals, setApprovals] =
    useState<SampleApproval[]>(SAMPLE_APPROVALS);

  function decide(id: string, decision: Decision) {
    setApprovals((list) =>
      list.map((item) =>
        item.id === id ? { ...item, status: decision } : item,
      ),
    );
  }

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Approvals
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Review requested changes before money or schedule
          moves.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Inbox className="h-7 w-7 text-primary" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-navy">
                Nothing waiting for your decision
              </h2>
              <p className="mt-2 max-w-sm text-sm text-ink/60">
                When a coordinator requests a change, it
                appears here with its cost and schedule impact.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {pending.map((approval) => (
            <Card key={approval.id}>
              <CardHeader
                title={approval.title}
                subtitle={`${approval.projectId} · requested by ${approval.requestedBy} on ${formatDate(approval.date)}`}
                action={
                  <span className="rounded-full bg-accent/25 px-3 py-1 text-xs font-bold text-accent-dark">
                    Awaiting your decision
                  </span>
                }
              />
              <CardBody>
                <p className="text-sm leading-relaxed text-ink/75">
                  {approval.reason}
                </p>
                <div className="mt-4 rounded-lg bg-pale px-4 py-3 text-sm">
                  <span className="font-semibold text-ink">
                    Impact:{" "}
                  </span>
                  <span className="text-ink/75">{approval.impact}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-lg font-bold text-navy">
                    {formatKES(approval.amount)}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => decide(approval.id, "approved")}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button
                      variant="navy"
                      onClick={() => decide(approval.id, "declined")}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Decline
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <Card>
          <CardHeader title="Previously decided" />
          <CardBody>
            <ul className="divide-y divide-navy/10">
              {decided.map((approval) => (
                <li
                  key={approval.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {approval.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/55">
                      {formatKES(approval.amount)} ·{" "}
                      {formatDate(approval.date)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      approval.status === "approved"
                        ? "bg-primary/10 text-primary"
                        : "bg-navy/10 text-navy"
                    }`}
                  >
                    {approval.status === "approved"
                      ? "Approved"
                      : "Declined"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink/55">
              Decisions shown are part of the demonstration
              data.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
