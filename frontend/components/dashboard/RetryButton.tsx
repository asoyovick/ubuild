"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

export function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  function retry() {
    setRetrying(true);
    router.refresh();
    window.setTimeout(() => setRetrying(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={retry}
      disabled={retrying}
      className="inline-flex items-center gap-2 rounded-md border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-navy/40 disabled:opacity-60"
    >
      <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
      {retrying ? "Retrying…" : label}
    </button>
  );
}
