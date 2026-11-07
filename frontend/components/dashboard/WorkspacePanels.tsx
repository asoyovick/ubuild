"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  Approval,
  BOQItem,
  BudgetView,
  Issue,
  Milestone,
  ProjectDocument,
  Quotation,
  Report,
  Task,
  TeamMember,
} from "@/lib/backend-projects";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  label,
  workspaceRequest,
} from "@/lib/workspace-client";
import { Download, FileUp } from "lucide-react";

const inputClass =
  "w-full rounded border border-navy/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light";
const buttonClass =
  "inline-flex items-center justify-center rounded bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-dark disabled:opacity-60";
const smallButtonClass =
  "rounded border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-navy/40 disabled:opacity-50";

function useAction() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function run<T>(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<T | null> {
    setSaving(true);
    setError("");
    const result = await workspaceRequest<T>(path, method, body);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    router.refresh();
    return result.data;
  }

  return { saving, error, setError, run };
}

function ErrorNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink/60">{children}</p>;
}

function SectionForm({
  title,
  children,
  saving,
  error,
  submitLabel,
  onSubmit,
  encType,
}: {
  title: string;
  children: ReactNode;
  saving: boolean;
  error: string;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  encType?: string;
}) {
  return (
    <form onSubmit={onSubmit} encType={encType} className="space-y-3 border-b border-navy/10 pb-5">
      <h3 className="text-sm font-bold text-navy">{title}</h3>
      {children}
      <ErrorNotice message={error} />
      <button type="submit" disabled={saving} className={buttonClass}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export function TaskPanel({
  projectId,
  tasks,
  team,
  canCreate,
  canEdit,
}: {
  projectId: string;
  tasks: Task[];
  team: TeamMember[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const action = useAction();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const result = await action.run(`projects/${projectId}/tasks`, "POST", values);
    if (result) form.reset();
  }

  async function setStatus(taskId: string, status: string) {
    await action.run(`projects/${projectId}/tasks/${taskId}`, "PATCH", { status });
  }

  return (
    <div className="space-y-5">
      {canCreate && (
        <SectionForm title="Add a task" saving={action.saving} error={action.error} submitLabel="Add task" onSubmit={create}>
          <input name="title" required placeholder="Task title" className={inputClass} />
          <textarea name="description" rows={2} placeholder="What needs to happen?" className={inputClass} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="assigneeId" defaultValue="" className={inputClass}>
              <option value="">Unassigned</option>
              {team.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name} ({label(member.role)})
                </option>
              ))}
            </select>
            <input name="dueAt" type="date" className={inputClass} aria-label="Due date" />
          </div>
        </SectionForm>
      )}

      {tasks.length === 0 ? (
        <Empty>No tasks have been added to this project yet.</Empty>
      ) : (
        <ul className="divide-y divide-navy/10">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{task.title}</p>
                {task.description && <p className="mt-0.5 text-sm text-ink/60">{task.description}</p>}
                <p className="mt-1 text-xs text-ink/45">
                  {task.assigneeName || "Unassigned"}
                  {task.dueAt ? ` · due ${formatDate(task.dueAt)}` : ""}
                </p>
              </div>
              {canEdit ? (
                <select
                  value={task.status}
                  onChange={(event) => setStatus(task.id, event.target.value)}
                  disabled={action.saving}
                  aria-label={`Status for ${task.title}`}
                  className="rounded border border-navy/20 bg-white px-2 py-1 text-xs font-semibold text-navy"
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="DONE">Done</option>
                </select>
              ) : (
                <span className={smallButtonClass}>{label(task.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MilestonePanel({
  projectId,
  milestones,
  canManage,
}: {
  projectId: string;
  milestones: Milestone[];
  canManage: boolean;
}) {
  const action = useAction();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await action.run(`projects/${projectId}/milestones`, "POST", Object.fromEntries(new FormData(form).entries()));
    if (result) form.reset();
  }

  async function setStatus(milestoneId: string, status: string) {
    await action.run(`projects/${projectId}/milestones/${milestoneId}`, "PATCH", { status });
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <SectionForm title="Add a milestone" saving={action.saving} error={action.error} submitLabel="Add milestone" onSubmit={create}>
          <input name="title" required placeholder="Milestone title" className={inputClass} />
          <textarea name="description" rows={2} placeholder="Scope or acceptance criteria" className={inputClass} />
          <input name="dueAt" type="date" required className={inputClass} aria-label="Due date" />
        </SectionForm>
      )}
      {milestones.length === 0 ? (
        <Empty>No milestones have been scheduled yet.</Empty>
      ) : (
        <ul className="divide-y divide-navy/10">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-ink">{milestone.title}</p>
                {milestone.description && <p className="mt-0.5 text-sm text-ink/60">{milestone.description}</p>}
                <p className="mt-1 text-xs text-ink/45">Due {formatDate(milestone.dueAt)}</p>
              </div>
              {canManage ? (
                <select
                  value={milestone.status}
                  onChange={(event) => setStatus(milestone.id, event.target.value)}
                  disabled={action.saving}
                  aria-label={`Status for ${milestone.title}`}
                  className="rounded border border-navy/20 bg-white px-2 py-1 text-xs font-semibold text-navy"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              ) : (
                <span className={smallButtonClass}>{label(milestone.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BudgetPanel({
  projectId,
  budget,
  canEdit,
  canApprove,
}: {
  projectId: string;
  budget: BudgetView;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const action = useAction();

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const result = await action.run(`projects/${projectId}/budget-items`, "POST", {
      category: values.category,
      description: values.description,
      amountCents: Math.round(Number(values.amount) * 100),
    });
    if (result) form.reset();
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const result = await action.run(`projects/${projectId}/expenses`, "POST", {
      description: values.description,
      amountCents: Math.round(Number(values.amount) * 100),
      incurredAt: values.incurredAt,
    });
    if (result) form.reset();
  }

  async function decide(expenseId: string, status: "APPROVED" | "REJECTED") {
    await action.run(`projects/${projectId}/expenses/${expenseId}`, "PATCH", { status });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Money label="Budget" value={budget.totalBudgetCents} />
        <Money label="Approved spend" value={budget.approvedExpenseCents} />
        <Money label="Pending spend" value={budget.pendingExpenseCents} tone="warning" />
        <Money label="Remaining" value={budget.remainingCents} tone={budget.remainingCents < 0 ? "danger" : "primary"} />
      </div>

      {canEdit && (
        <SectionForm title="Add a budget line" saving={action.saving} error={action.error} submitLabel="Add budget line" onSubmit={addItem}>
          <input name="category" required placeholder="Category, e.g. Structure" className={inputClass} />
          <input name="description" placeholder="Description" className={inputClass} />
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount" className={inputClass} />
        </SectionForm>
      )}

      <div>
        <h3 className="text-sm font-bold text-navy">Budget lines</h3>
        {budget.items.length === 0 ? (
          <div className="mt-2"><Empty>No budget lines have been recorded.</Empty></div>
        ) : (
          <ul className="mt-2 divide-y divide-navy/10">
            {budget.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-ink">{item.category}</p>
                  {item.description && <p className="text-xs text-ink/55">{item.description}</p>}
                </div>
                <span className="text-sm font-semibold text-navy">{formatMoney(item.amountCents, item.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionForm title="Request an expense" saving={action.saving} error={action.error} submitLabel="Submit expense" onSubmit={addExpense}>
        <input name="description" required placeholder="Expense description" className={inputClass} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount" className={inputClass} />
          <input name="incurredAt" type="date" className={inputClass} aria-label="Date incurred" />
        </div>
      </SectionForm>

      <div>
        <h3 className="text-sm font-bold text-navy">Expenses</h3>
        {budget.expenses.length === 0 ? (
          <div className="mt-2"><Empty>No expenses have been submitted.</Empty></div>
        ) : (
          <ul className="mt-2 divide-y divide-navy/10">
            {budget.expenses.map((expense) => (
              <li key={expense.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-ink">{expense.description}</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {formatMoney(expense.amountCents, expense.currency)} · {label(expense.status)}
                    {expense.incurredAt ? ` · ${formatDate(expense.incurredAt)}` : ""}
                  </p>
                </div>
                {canApprove && expense.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button type="button" disabled={action.saving} onClick={() => decide(expense.id, "APPROVED")} className={smallButtonClass}>
                      Approve
                    </button>
                    <button type="button" disabled={action.saving} onClick={() => decide(expense.id, "REJECTED")} className={smallButtonClass}>
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className={smallButtonClass}>{label(expense.status)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Money({ label: title, value, tone = "primary" }: { label: string; value: number; tone?: "primary" | "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-accent-dark" : "text-navy";
  return (
    <div className="rounded-md border border-navy/10 bg-white px-4 py-3">
      <p className="text-xs font-medium text-ink/50">{title}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{formatMoney(value)}</p>
    </div>
  );
}

export function DocumentPanel({
  projectId,
  documents,
  canUpload,
}: {
  projectId: string;
  documents: ProjectDocument[];
  canUpload: boolean;
}) {
  const action = useAction();

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("file");
    if (!(file instanceof File) || file.size === 0) {
      action.setError("Choose a file to upload.");
      return;
    }
    const result = await action.run(`projects/${projectId}/documents`, "POST", values);
    if (result) form.reset();
  }

  return (
    <div className="space-y-5">
      {canUpload && (
        <SectionForm title="Upload a document or photo" saving={action.saving} error={action.error} submitLabel="Upload" onSubmit={upload} encType="multipart/form-data">
          <input name="title" required placeholder="Document title" className={inputClass} />
          <select name="kind" defaultValue="OTHER" className={inputClass} aria-label="Document type">
            <option value="DRAWING">Drawing</option>
            <option value="REPORT">Report</option>
            <option value="PHOTO">Photo</option>
            <option value="DELIVERY">Delivery note</option>
            <option value="BOQ">BOQ</option>
            <option value="OTHER">Other</option>
          </select>
          <input name="file" type="file" required className="block w-full text-sm text-ink/70 file:mr-3 file:rounded file:border-0 file:bg-navy/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy" />
        </SectionForm>
      )}

      {documents.length === 0 ? (
        <Empty>No documents or photos have been uploaded yet.</Empty>
      ) : (
        <ul className="divide-y divide-navy/10">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{document.title}</p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {label(document.kind)} · {document.fileName} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB · {formatDateTime(document.createdAt)}
                </p>
              </div>
              <a
                href={`/api/backend/projects/${projectId}/documents/${document.id}/download`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Download
              </a>
            </li>
          ))}
        </ul>
      )}
      {canUpload && documents.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-ink/45">
          <FileUp className="h-4 w-4" aria-hidden="true" /> Files are stored privately and only served to active project members.
        </p>
      )}
    </div>
  );
}

export function ReportPanel({
  projectId,
  reports,
  canSubmit,
}: {
  projectId: string;
  reports: Report[];
  canSubmit: boolean;
}) {
  const action = useAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await action.run(`projects/${projectId}/reports`, "POST", Object.fromEntries(new FormData(form).entries()));
    if (result) form.reset();
  }

  return (
    <div className="space-y-5">
      {canSubmit && (
        <SectionForm title="Submit a progress report" saving={action.saving} error={action.error} submitLabel="Submit report" onSubmit={submit}>
          <input name="title" required placeholder="Report title" className={inputClass} />
          <select name="kind" defaultValue="PROGRESS" className={inputClass} aria-label="Report type">
            <option value="DAILY">Daily</option>
            <option value="PROGRESS">Progress</option>
            <option value="INSPECTION">Inspection</option>
          </select>
          <textarea name="body" rows={4} required placeholder="What happened on site?" className={inputClass} />
        </SectionForm>
      )}
      {reports.length === 0 ? (
        <Empty>No progress reports have been submitted yet.</Empty>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="border-b border-navy/10 pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{report.title}</p>
                <span className={smallButtonClass}>{label(report.kind)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{report.body}</p>
              <p className="mt-1 text-xs text-ink/45">
                {report.authorName || "Project member"} · {formatDateTime(report.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ApprovalPanel({
  projectId,
  approvals,
  canRequest,
  canDecide,
}: {
  projectId: string;
  approvals: Approval[];
  canRequest: boolean;
  canDecide: boolean;
}) {
  const action = useAction();

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const amount = Number(values.amount);
    const result = await action.run(`projects/${projectId}/approvals`, "POST", {
      title: values.title,
      details: values.details,
      kind: values.kind,
      amountCents: amount > 0 ? Math.round(amount * 100) : null,
    });
    if (result) form.reset();
  }

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    await action.run(`projects/${projectId}/approvals/${id}`, "PATCH", { status });
  }

  return (
    <div className="space-y-5">
      {canRequest && (
        <SectionForm title="Request approval" saving={action.saving} error={action.error} submitLabel="Send request" onSubmit={request}>
          <input name="title" required placeholder="What needs approval?" className={inputClass} />
          <select name="kind" defaultValue="CHANGE" className={inputClass} aria-label="Approval type">
            <option value="CHANGE">Change</option>
            <option value="VARIATION">Variation</option>
            <option value="MATERIAL">Material</option>
            <option value="EXPENSE">Expense</option>
            <option value="REPORT">Report</option>
          </select>
          <textarea name="details" rows={3} placeholder="Details and reason" className={inputClass} />
          <input name="amount" type="number" min="0" step="0.01" placeholder="Amount (optional)" className={inputClass} />
        </SectionForm>
      )}
      {approvals.length === 0 ? (
        <Empty>No approval requests have been raised yet.</Empty>
      ) : (
        <ul className="divide-y divide-navy/10">
          {approvals.map((approval) => (
            <li key={approval.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{approval.title}</p>
                {approval.details && <p className="mt-0.5 text-sm text-ink/60">{approval.details}</p>}
                <p className="mt-1 text-xs text-ink/45">
                  {label(approval.kind)}
                  {approval.amountCents ? ` · ${formatMoney(approval.amountCents)}` : ""}
                  {" · "}
                  {formatDateTime(approval.createdAt)}
                </p>
              </div>
              {canDecide && approval.status === "PENDING" ? (
                <div className="flex gap-2">
                  <button type="button" disabled={action.saving} onClick={() => decide(approval.id, "APPROVED")} className={smallButtonClass}>
                    Approve
                  </button>
                  <button type="button" disabled={action.saving} onClick={() => decide(approval.id, "REJECTED")} className={smallButtonClass}>
                    Reject
                  </button>
                </div>
              ) : (
                <span className={smallButtonClass}>{label(approval.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function QuotationPanel({
  projectId,
  quotations,
  canSubmit,
  canDecide,
}: {
  projectId: string;
  quotations: Quotation[];
  canSubmit: boolean;
  canDecide: boolean;
}) {
  const action = useAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const result = await action.run(`projects/${projectId}/quotations`, "POST", {
      item: values.item,
      description: values.description,
      amountCents: Math.round(Number(values.amount) * 100),
    });
    if (result) form.reset();
  }

  async function decide(id: string, status: "ACCEPTED" | "REJECTED") {
    await action.run(`projects/${projectId}/quotations/${id}`, "PATCH", { status });
  }

  return (
    <div className="space-y-5">
      {canSubmit && (
        <SectionForm title="Submit a quotation" saving={action.saving} error={action.error} submitLabel="Submit quotation" onSubmit={submit}>
          <input name="item" required placeholder="Item or service quoted" className={inputClass} />
          <textarea name="description" rows={2} placeholder="Specification, lead time, notes" className={inputClass} />
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount" className={inputClass} />
        </SectionForm>
      )}
      {quotations.length === 0 ? (
        <Empty>No quotations have been submitted yet.</Empty>
      ) : (
        <ul className="divide-y divide-navy/10">
          {quotations.map((quotation) => (
            <li key={quotation.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{quotation.item}</p>
                {quotation.description && <p className="mt-0.5 text-sm text-ink/60">{quotation.description}</p>}
                <p className="mt-1 text-xs text-ink/45">
                  {quotation.supplierName || "Supplier"} · {formatMoney(quotation.amountCents, quotation.currency)} · {formatDateTime(quotation.createdAt)}
                </p>
              </div>
              {canDecide && quotation.status === "SUBMITTED" ? (
                <div className="flex gap-2">
                  <button type="button" disabled={action.saving} onClick={() => decide(quotation.id, "ACCEPTED")} className={smallButtonClass}>
                    Accept
                  </button>
                  <button type="button" disabled={action.saving} onClick={() => decide(quotation.id, "REJECTED")} className={smallButtonClass}>
                    Reject
                  </button>
                </div>
              ) : (
                <span className={smallButtonClass}>{label(quotation.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BOQPanel({
  projectId,
  items,
  canSubmit,
}: {
  projectId: string;
  items: BOQItem[];
  canSubmit: boolean;
}) {
  const action = useAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const result = await action.run(`projects/${projectId}/boq`, "POST", {
      description: values.description,
      quantity: Number(values.quantity),
      unit: values.unit,
      rateCents: Math.round(Number(values.rate) * 100),
    });
    if (result) form.reset();
  }

  const total = items.reduce((sum, item) => sum + Math.round(item.quantity * item.rateCents), 0);

  return (
    <div className="space-y-5">
      {canSubmit && (
        <SectionForm title="Add a BOQ line" saving={action.saving} error={action.error} submitLabel="Add BOQ line" onSubmit={submit}>
          <input name="description" required placeholder="Item description" className={inputClass} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="quantity" type="number" min="0.01" step="0.01" required placeholder="Quantity" className={inputClass} />
            <input name="unit" required placeholder="Unit, e.g. m²" className={inputClass} />
            <input name="rate" type="number" min="0" step="0.01" required placeholder="Rate" className={inputClass} />
          </div>
        </SectionForm>
      )}
      {items.length === 0 ? (
        <Empty>No bill of quantities lines have been recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/15 text-xs uppercase tracking-wide text-ink/45">
                <th className="py-2 pr-3 font-semibold">Description</th>
                <th className="py-2 pr-3 font-semibold">Quantity</th>
                <th className="py-2 pr-3 font-semibold">Unit</th>
                <th className="py-2 pr-3 font-semibold">Rate</th>
                <th className="py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/10">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 text-ink">{item.description}</td>
                  <td className="py-2 pr-3 text-ink/70">{item.quantity}</td>
                  <td className="py-2 pr-3 text-ink/70">{item.unit}</td>
                  <td className="py-2 pr-3 text-ink/70">{formatMoney(item.rateCents)}</td>
                  <td className="py-2 font-semibold text-navy">{formatMoney(Math.round(item.quantity * item.rateCents))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-navy/15">
                <td colSpan={4} className="py-2 pr-3 text-right text-xs font-bold uppercase tracking-wide text-ink/45">BOQ total</td>
                <td className="py-2 font-bold text-navy">{formatMoney(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export function IssuePanel({
  projectId,
  issues,
  canManage,
}: {
  projectId: string;
  issues: Issue[];
  canManage: boolean;
}) {
  const action = useAction();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await action.run(`projects/${projectId}/issues`, "POST", Object.fromEntries(new FormData(form).entries()));
    if (result) form.reset();
  }

  async function setStatus(issueId: string, status: string) {
    await action.run(`projects/${projectId}/issues/${issueId}`, "PATCH", { status });
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <SectionForm title="Raise an issue" saving={action.saving} error={action.error} submitLabel="Raise issue" onSubmit={create}>
          <input name="title" required placeholder="Issue title" className={inputClass} />
          <textarea name="details" rows={2} placeholder="What is blocked or unsafe?" className={inputClass} />
          <select name="severity" defaultValue="MEDIUM" className={inputClass} aria-label="Severity">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </SectionForm>
      )}
      {issues.length === 0 ? (
        <Empty>No issues have been raised on this project.</Empty>
      ) : (
        <ul className="divide-y divide-navy/10">
          {issues.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{issue.title}</p>
                {issue.details && <p className="mt-0.5 text-sm text-ink/60">{issue.details}</p>}
                <p className="mt-1 text-xs text-ink/45">
                  {label(issue.severity)} severity · {formatDateTime(issue.createdAt)}
                </p>
              </div>
              {canManage ? (
                <select
                  value={issue.status}
                  onChange={(event) => setStatus(issue.id, event.target.value)}
                  disabled={action.saving}
                  aria-label={`Status for ${issue.title}`}
                  className="rounded border border-navy/20 bg-white px-2 py-1 text-xs font-semibold text-navy"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              ) : (
                <span className={smallButtonClass}>{label(issue.status)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
