"use client";

import { Input } from "@base-ui/react";
import {
  ArrowRightIcon,
  CogIcon,
  PackageOpenIcon,
  PlusIcon,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useUser } from "@/context/auth-context";
import { useProject } from "@/context/project-context";
import type { Project } from "@/generated/prisma";
import { useDeleteProject } from "@/hooks/use-projects";
import { CreateProjectDialog } from "../CreateProjectDialog";
import { GridBox } from "../GridBox";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/dashboard/settings`}
      className="group w-72 overflow-hidden rounded-3xl bg-zinc-950 text-left ring-1 ring-zinc-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] transition-all duration-300 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
    >
      <div className="flex flex-col items-center gap-5 px-8 pt-12 pb-10">
        <div className="flex size-16 items-center justify-center rounded-xl bg-gradient-to-b from-white to-zinc-300 shadow-lg shadow-black/50 ring-1 ring-white/10">
          <PackageOpenIcon
            size={30}
            strokeWidth={2.5}
            className="text-zinc-900"
          />
        </div>
        <h2 className="text-lg font-semibold text-white">{project.name}</h2>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800/80 px-5 py-4">
        <span className="text-sm text-zinc-500 font-medium transition-colors duration-300">
          Manage this project
        </span>
        <CogIcon
          size={16}
          className="text-zinc-600 transition-all duration-300"
        />
      </div>
    </Link>
  );
}

function CreateProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group  w-72  cursor-pointer overflow-hidden rounded-3xl bg-zinc-950 text-left ring-1 ring-zinc-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] transition-all duration-300 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
    >
      <div className="flex flex-col items-center gap-5 px-8 pt-12 pb-10">
        <div className="flex size-16 items-center justify-center rounded-xl bg-gradient-to-b from-white to-zinc-300 shadow-lg shadow-black/50 ring-1 ring-white/10">
          <PlusIcon size={30} strokeWidth={2.5} className="text-zinc-900" />
        </div>
        <h2 className="text-lg font-semibold text-white">New project</h2>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800/80 px-5 py-4">
        <span className="text-sm text-zinc-500 font-medium transition-colors duration-300">
          Press to create a new project
        </span>
        <ArrowRightIcon
          size={16}
          className="text-zinc-600 transition-all duration-300"
        />
      </div>
    </button>
  );
}

export function OverviewPage() {
  const { project, projects, loading, refresh } = useProject();
  const deleteProject = useDeleteProject();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingProjectName, setDeletingProjectName] = useState("");

  const handleDelete = useCallback(async () => {
    if (deletingProjectName !== project.name) return;
    if (!project) return; //somehow wasted SO MUCH of my life for this check so this comment will be here in memory of my wasted time
    await deleteProject.mutateAsync(project.id);
    setDeleteOpen(false);
  }, [deletingProjectName, project, deleteProject]);

  console.log("before load");
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl h-[calc(100dvh-4rem)] flex  px-8">
        <div className="max-w-6xl w-full p-8">
          <div className=" flex flex-col gap-4 ">
            <div className="flex flex-row gap-1">
              <Skeleton className=" h-2 w-20 rounded-md" />
              <Skeleton className=" h-2 w-30 rounded-md" />
              <Skeleton className=" h-2 w-2 rounded-md" />
            </div>
            <Skeleton className=" h-72 rounded-3xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  console.log("after load");

  if (projects.length === 0) {
    console.log("no projects");
    return (
      <div className="mx-auto max-w-6xl h-[calc(100dvh-4rem)] flex items-center justify-center px-8">
        <GridBox>
          <div className="relative flex justify-center px-6 py-16">
            <CreateProjectButton onClick={() => setCreateOpen(true)} />
          </div>
          <CreateProjectDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => refresh()}
          />
        </GridBox>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mt-1">
          <p className="text-zinc-500 text-sm">
            {project.name}
            {project.githubRepo ? ` · ${project.githubRepo}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <GridBox>
        <div className="relative flex justify-center px-6 py-16  flex-row gap-6">
          <ProjectCard project={project} />

          <CreateProjectButton onClick={() => setCreateOpen(true)} />
        </div>
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => refresh()}
        />
      </GridBox>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will permanently delete the project{" "}
              <span className="font-medium text-zinc-200">{project.name}</span>{" "}
              everything associated with it. <br></br>This action{" "}
              <span className="font-semibold text-zinc-200">
                cannot be undone
              </span>
              .
              <p className="text-bold text-zinc-200 mt-2">
                Type the project name below to confirm.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="project-name"
                className="mb-1 block text-xs text-zinc-500"
              >
                Project name
              </label>
              <Input
                id="project-name"
                value={deletingProjectName}
                onChange={(e) => setDeletingProjectName(e.target.value)}
                placeholder={project.name}
                aria-invalid={deletingProjectName !== project.name}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-red-800 text-red-400 hover:bg-red-950"
              disabled={
                deleteProject.isPending || deletingProjectName !== project.name
              }
              onClick={handleDelete}
            >
              {deleteProject.isPending ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
