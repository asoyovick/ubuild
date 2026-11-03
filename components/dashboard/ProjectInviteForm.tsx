"use client";

import { useState, type FormEvent } from "react";

const ROLES = [
  ["COORDINATOR", "Coordinator"],
  ["ARCHITECT", "Architect"],
  ["ENGINEER", "Engineer"],
  ["QUANTITY_SURVEYOR", "Quantity surveyor"],
  ["SITE_SUPERVISOR", "Site supervisor"],
  ["CONTRACTOR", "Contractor"],
  ["SUPPLIER", "Supplier"],
] as const;

export function ProjectInviteForm({ projectId }: { projectId: string }) {
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setSaving(true);
    setError("");
    setInviteUrl("");
    setCopied(false);

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(Object.values(result.errors ?? {})[0] as string ?? result.error ?? "We couldn't create the invitation. Check the details and try again.");
        return;
      }

      setInviteEmail(String(values.email));
      setInviteUrl(`${window.location.origin}/dashboard/projects/accept-invitation?token=${encodeURIComponent(result.token)}`);
      form.reset();
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  return (
    <section className="border-y border-navy/15 py-5" aria-labelledby="invite-heading">
      <h2 id="invite-heading" className="font-semibold text-navy">Invite a team member</h2>
      <p className="mt-1 text-sm text-ink/65">Create a seven-day link for the invited person to accept using their account.</p>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_13rem_auto]">
        <label className="sr-only" htmlFor="invite-email">Email address</label>
        <input id="invite-email" name="email" type="email" required placeholder="Email address" className="rounded border border-navy/20 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
        <label className="sr-only" htmlFor="invite-role">Project role</label>
        <select id="invite-role" name="role" required defaultValue="" className="rounded border border-navy/20 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light">
          <option value="" disabled>Select a project role</option>
          {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" disabled={saving} className="rounded bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60">
          {saving ? "Creating…" : "Create link"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      {inviteUrl && (
        <div className="mt-4 border-l-2 border-primary pl-4" role="status">
          <p className="text-sm font-medium text-navy">Invitation created for {inviteEmail}</p>
          <p className="mt-1 break-all text-xs text-ink/60">{inviteUrl}</p>
          <button type="button" onClick={copyInvite} className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {copied ? "Copied" : "Copy invitation link"}
          </button>
        </div>
      )}
    </section>
  );
}
