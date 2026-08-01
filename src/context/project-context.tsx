"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
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
  let currRoute: string;
  try {
    currRoute = window.location.pathname;
  } catch {
    currRoute = "/";
  }
  const { data: projects = [], isLoading, refetch } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("currentProject");
    } catch {
      return null;
    }
  });

  const project = useMemo(() => {
    if (selectedId) {
      const match = projects.find((p) => p.id === selectedId);
      if (match) return match;
    }
    return projects[0] as Project | undefined;
  }, [projects, selectedId]);

  const setProject = useCallback((id: string) => {
    try {
      localStorage.setItem("currentProject", id);
    } catch {}
    setSelectedId(id);
  }, []);
  if (currRoute !== "/dashboard" && !project) {
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
      <div key={project?.id ?? "no-project"}>{children}</div>
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
