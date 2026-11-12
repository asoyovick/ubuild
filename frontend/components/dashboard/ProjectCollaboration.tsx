"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";
import { formatMoment, stageLabel, type Engagement, type ProjectMessage } from "@/lib/ubuild-shared";

export function ProjectCollaboration({
  projectId,
  userId,
  messages,
  engagements,
}: {
  projectId: string;
  userId: string;
  messages: ProjectMessage[];
  engagements: Engagement[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function post(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSending(true);
    setError("");
    const result = await workspaceRequest(`projects/${projectId}/messages`, "POST", {
      engagementId: String(values.get("engagementId") ?? ""),
      body: String(values.get("body") ?? ""),
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  const ordered = [...messages].reverse();

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-navy/10 bg-white">
        <div className="border-b border-navy/10 px-4 py-3">
          <h2 className="font-semibold text-navy">Project conversation</h2>
          <p className="text-xs text-ink/55">
            Messages are visible to active project members and the professionals engaged on this project.
          </p>
        </div>
        <ul className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-4">
          {ordered.map((message) => {
            const mine = message.userId === userId;
            return (
              <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? "bg-navy text-white" : "bg-navy/5 text-ink"}`}>
                  <p className={`text-xs font-semibold ${mine ? "text-white/70" : "text-navy"}`}>
                    {message.userName || message.userId}
                    {message.engagementId ? " · engagement message" : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{message.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/50" : "text-ink/40"}`}>
                    {formatMoment(message.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
          {messages.length === 0 && (
            <li className="py-6 text-center text-sm text-ink/60">
              No messages yet. Start the conversation with the project team.
            </li>
          )}
        </ul>
        <form onSubmit={post} className="space-y-3 border-t border-navy/10 px-4 py-4">
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Share an update, ask a question, or confirm a deliverable…"
            className="w-full rounded-md border border-navy/20 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-ink/70">
              Attach to engagement <span className="font-normal text-ink/50">(optional)</span>
              <select name="engagementId" defaultValue="" className="ml-2 rounded-md border border-navy/20 px-3 py-2 text-sm">
                <option value="">Project-wide</option>
                {engagements.map((engagement) => (
                  <option key={engagement.id} value={engagement.id}>
                    {stageLabel(engagement.constructionStage)} — {engagement.scope}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={sending}
              className="ml-auto rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
