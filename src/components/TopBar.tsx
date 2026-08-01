"use client";
import { LogOutIcon, PackageOpenIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/context/auth-context";
import { useProject } from "@/context/project-context";
import { CreateProjectDialog } from "./CreateProjectDialog";
import ProjectSwitcher from "./ProjectSwitcher";
import { SearchBar } from "./SearchBar";
import { Button } from "./ui/button";

export function TopBar() {
  const user = useUser();
  const {
    project: currentProject,
    setProject,
    projects,
    loading,
    refresh,
  } = useProject();
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    document.title = currentProject
      ? `Otasifiy | ${currentProject.name}`
      : "Otasifiy";
  }, [currentProject]);

  console.log("TopBar render", { currentProject, projects, loading });

  return (
    <div className="grid grid-cols-[1fr_auto_1fr]     h-16 items-center   border-b border-zinc-800 bg-zinc-950 px-4 top-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <PackageOpenIcon className="size-5 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-100">Otasifiy</span>
        </div>
        {!loading && projects.length > 0 ? (
          <ProjectSwitcher
            onProjectSwitched={(project) => setProject(project)}
            currentProject={currentProject}
            isOpen={isProjectSwitcherOpen}
            onOpenChange={(open) => setIsProjectSwitcherOpen(open)}
            onAddProject={() => {
              setIsProjectSwitcherOpen(false);
              setCreateOpen(true);
            }}
            projects={projects}
          />
        ) : (
          !loading && <CreateProjectDialog onCreated={refresh} />
        )}
      </div>
      <SearchBar />

      <div className="flex items-center gap-2 justify-end">
        <Avatar size="sm">
          <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm text-white">{user.email}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => window.location.assign("/api/auth/logout")}
          className="group"
        >
          <LogOutIcon className="size-4 text-zinc-400 group-hover:text-red-400" />
        </Button>
      </div>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </div>
  );
}
