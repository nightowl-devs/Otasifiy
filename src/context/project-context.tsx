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

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const currRoute = window.location.pathname;
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
  if(currRoute !== "/dashboard" && !project) {
    return (
      <div className="flex h-screen w-screen  bg-zinc-900 items-center justify-center">
        <div className="border border-zinc-700 border-t-white rounded-full animate-spin w-12 h-12"></div>
      </div>
    );
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
