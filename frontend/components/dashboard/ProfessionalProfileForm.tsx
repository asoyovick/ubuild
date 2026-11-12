"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";

const STAGES = [
  "DESIGN",
  "PERMIT",
  "MOBILIZATION",
  "FOUNDATION",
  "FRAME",
  "ROOFING",
  "ENCLOSURE",
  "MECHANICS",
  "FINISHES",
  "CLOSING",
];

export function ProfessionalProfileForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(stage: string) {
    setSelected((current) =>
      current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage],
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setError("");
    setMessage("");

    const result = await workspaceRequest("professionals/me", "PUT", {
      headline: String(values.get("headline") ?? ""),
      disciplines: selected,
      qualifications: String(values.get("qualifications") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      yearsExperience: Number(values.get("yearsExperience") ?? 0),
      location: String(values.get("location") ?? ""),
      availability: String(values.get("availability") ?? "AVAILABLE"),
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Your professional profile is published.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-ink/70">
        Professional headline
        <input
          name="headline"
          required
          placeholder="NCA-registered foundation and structural contractor"
          className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
        />
      </label>
      <div>
        <p className="text-sm font-medium text-ink/70">Stages you work on</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => toggle(stage)}
              aria-pressed={selected.includes(stage)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                selected.includes(stage)
                  ? "border-navy bg-navy text-white"
                  : "border-navy/20 text-ink/70 hover:border-navy/40"
              }`}
            >
              {stage.charAt(0) + stage.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-medium text-ink/70">
        Qualifications (comma separated)
        <input
          name="qualifications"
          placeholder="NCA 4, BSc Civil Engineering"
          className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-ink/70">
          Years of experience
          <input
            name="yearsExperience"
            type="number"
            min={0}
            max={70}
            defaultValue={0}
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Location
          <input
            name="location"
            placeholder="Nairobi"
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="block text-sm font-medium text-ink/70">
          Availability
          <select
            name="availability"
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
      >
        {saving ? "Saving…" : "Publish profile"}
      </button>
    </form>
  );
}
