"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Professional, Recommendation } from "@/lib/ubuild-shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/backend";

export function ProfessionalFinder({
  professionals,
  stages,
}: {
  professionals: Professional[];
  stages: string[];
}) {
  const [stage, setStage] = useState(stages[0] ?? "FOUNDATION");
  const [scope, setScope] = useState("");
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function find(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/professionals/recommendations?stage=${encodeURIComponent(stage)}&scope=${encodeURIComponent(scope)}`,
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "We couldn't rank professionals right now.");
        return;
      }
      setResults(body.recommendations ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={find} className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr_auto]">
        <label className="text-sm font-medium text-ink/70">
          Construction stage
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
          >
            {stages.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0) + item.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink/70">
          What needs doing
          <input
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            placeholder="Foundation and ground slab for a three-bedroom house"
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={loading || scope.trim().length === 0}
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {loading ? "Ranking…" : "Rank professionals"}
        </button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {results && (
        <div className="space-y-3">
          <p className="text-xs text-ink/55">
            Ranking only. A recommendation never approves an engagement and never releases funds.
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-ink/65">No professionals match that stage and scope yet.</p>
          ) : (
            results.map((result, index) => (
              <article key={result.professional.userId} className="rounded-lg border border-navy/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-navy">
                    {index + 1}. {result.professional.name}
                  </h3>
                  <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
                    {result.score.toFixed(1)} match
                  </span>
                </div>
                <p className="text-sm text-ink/65">{result.professional.headline}</p>
                <ul className="mt-2 space-y-1 text-xs text-ink/60">
                  {result.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>
      )}

      {!results && (
        <div className="grid gap-3 sm:grid-cols-2">
          {professionals.map((professional) => (
            <article key={professional.userId} className="rounded-lg border border-navy/10 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-navy">{professional.name}</h3>
                  <p className="text-sm text-ink/65">{professional.headline}</p>
                </div>
                {professional.verified && (
                  <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-semibold text-navy">
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-ink/60">
                {professional.yearsExperience} years · {professional.location || "Location not stated"}
              </p>
              <p className="mt-1 text-xs text-ink/60">
                {professional.ratingCount > 0
                  ? `${professional.ratingAverage.toFixed(1)} / 5 from ${professional.ratingCount} UBuild engagement${professional.ratingCount === 1 ? "" : "s"}`
                  : "No UBuild ratings yet"}
              </p>
              {professional.disciplines.length > 0 && (
                <p className="mt-2 text-xs text-ink/55">{professional.disciplines.join(" · ")}</p>
              )}
            </article>
          ))}
          {professionals.length === 0 && (
            <p className="text-sm text-ink/65">No professional profiles have been published yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
