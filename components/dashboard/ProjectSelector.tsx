"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FolderOpen, Loader2 } from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
}

export function ProjectSelector({
  projects,
  currentProjectId,
}: {
  projects: ProjectOption[];
  currentProjectId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function selectProject(id: string) {
    setLoading(true);
    router.push(`/dashboard/projects/${id}`);
    router.refresh();
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => selectProject(project.id)}
          disabled={loading || project.id === currentProjectId}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            project.id === currentProjectId
              ? "bg-primary text-white"
              : "bg-white border border-navy/20 text-ink hover:border-primary hover:text-primary"
          } ${loading ? "opacity-60" : ""}`}
          aria-pressed={project.id === currentProjectId}
          aria-busy={loading}
        >
          {loading && project.id === currentProjectId ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {project.name}
          {project.id === currentProjectId && (
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
}
