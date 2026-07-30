"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { Project } from "@/generated/prisma";
import { useProjects } from "@/hooks/use-projects";

const ProjectContext = createContext<{
  project: Project;
  setProject: (id: string) => void;
  projects: Project[];
  loading: boolean;
  refresh: () => void;
} | null>(null);

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
    </div>
  );
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { data: projects = [], isLoading, refetch } = useProjects();
  let projectId: string | null = null;
  try {
    projectId = localStorage.getItem("currentProject");
  } catch {}

  const project = useMemo(() => {
    if (projectId) {
      const match = projects.find((p) => p.id === projectId);
      if (match) return match;
    }
    return projects[0] as Project | undefined;
  }, [projects, projectId]);

  const setProject = useCallback(
    (id: string) => {
      localStorage.setItem("currentProject", id);
      refetch();
    },
    [refetch],
  );

  if (isLoading && !project) {
    return <Loader />;
  }

  return (
    <ProjectContext.Provider
      value={{
        project: project as Project,
        setProject,
        projects,
        loading: isLoading,
        refresh: refetch,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const project = useContext(ProjectContext);
  if (!project) {
    throw new Error("useProject must be used within a <ProjectProvider>");
  }
  return project;
}
