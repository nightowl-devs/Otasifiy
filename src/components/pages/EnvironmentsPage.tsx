"use client";

import { EditIcon, Lock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProject } from "@/context/project-context";
import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useGitHubBranches,
  useGitHubRepos,
  useUpdateEnvironment,
} from "@/hooks/use-environments";

type EnvironmentWithCount = {
  id: string;
  name: string;
  branch: string;
  createdAt: Date;
  _count: { updates: number };
};

function AddEnvironmentDialog({
  branches,
  projectId,
  onCreated,
}: {
  branches: string[] | null;
  projectId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const createEnvironment = useCreateEnvironment(projectId);

  async function handleCreate() {
    if (!name || !branch) return;
    await createEnvironment.mutateAsync({ name, branch });
    setName("");
    setBranch("");
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            <Plus size={14} className="mr-1" />
            Add environment
          </Button>
        }
      />
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add environment</DialogTitle>
          <DialogDescription>
            Create a new environment linked to a branch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="add-env-name"
              className="mb-1 block text-xs text-zinc-500"
            >
              Name
            </label>
            <input
              id="add-env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="production"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs text-zinc-500">Branch</span>
            <Select
              value={branch}
              onValueChange={(val) => setBranch(val ?? "")}
            >
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-zinc-100">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-800 text-zinc-100">
                {branches === null ? (
                  <div className="px-3 py-2 text-sm text-zinc-500">
                    Loading...
                  </div>
                ) : (
                  branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={!name || !branch || createEnvironment.isPending}
            onClick={handleCreate}
          >
            {createEnvironment.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEnvironmentDialog({
  env,
  onDeleted,
}: {
  env: EnvironmentWithCount;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const deleteEnvironment = useDeleteEnvironment();

  async function handleDelete() {
    await deleteEnvironment.mutateAsync(env.id);
    setOpen(false);
    onDeleted();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-zinc-500 hover:text-red-400"
          >
            <Trash2 size={16} />
          </Button>
        }
      />
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete environment</DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-zinc-200">{env.name}</span> and{" "}
            <span className="font-semibold text-red-400">all updates</span>{" "}
            associated with it. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <input
          placeholder={`Type "${env.name}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="border-red-800 text-red-400 hover:bg-red-950"
            disabled={typed !== env.name || deleteEnvironment.isPending}
            onClick={handleDelete}
          >
            {deleteEnvironment.isPending ? "Deleting..." : "Delete environment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditEnvironmentDialog({
  env,
  onSaved,
}: {
  env: EnvironmentWithCount;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(env.name);
  const updateEnvironment = useUpdateEnvironment();

  async function handleSave() {
    if (!name) return;
    await updateEnvironment.mutateAsync({ id: env.id, name });
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-zinc-500 hover:text-zinc-300"
          >
            <EditIcon size={16} />
          </Button>
        }
      />
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit environment</DialogTitle>
          <DialogDescription>
            Only the name can be changed. Branch is locked after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="edit-env-name"
              className="mb-1 block text-xs text-zinc-500"
            >
              Name
            </label>
            <input
              id="edit-env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs text-zinc-500">Branch</span>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-500">
              <Lock size={14} />
              {env.branch}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={!name || updateEnvironment.isPending}
            onClick={handleSave}
          >
            {updateEnvironment.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditableRow({
  env,
  onSaved,
  onDeleted,
}: {
  env: EnvironmentWithCount;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  return (
    <TableRow className="border-zinc-800 hover:bg-zinc-800/30">
      <TableCell className="text-zinc-100">{env.name}</TableCell>
      <TableCell>{env.branch}</TableCell>
      <TableCell className="text-zinc-400">
        {new Date(env.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <EditEnvironmentDialog env={env} onSaved={onSaved} />
          <DeleteEnvironmentDialog env={env} onDeleted={onDeleted} />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function EnvironmentsPage() {
  const { project } = useProject();
  const { data: environments = [], refetch: refetchEnvs } = useEnvironments(
    project.id,
  );
  const { data: repos = null, refetch: refetchRepos } = useGitHubRepos();
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const { data: branches = null } = useGitHubBranches(project.id);

  const [currentRepo, setCurrentRepo] = useState(project.githubRepo);
  async function selectRepo(fullName: string) {
    const prev = currentRepo;
    setShowRepoPicker(false);
    setCurrentRepo(fullName);

    try {
      await fetch("/api/github/set-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: fullName, projectId: project.id }),
      });
    } catch (err) {
      console.error("Failed to set repo", err);
      setShowRepoPicker(true);
      setCurrentRepo(prev);
    }
  }

  const githubRepo = project.githubRepo;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Environments</h1>

        <AddEnvironmentDialog
          branches={branches}
          projectId={project.id}
          onCreated={() => refetchEnvs()}
        />
      </div>

      <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-2 text-md font-medium text-white">
          GitHub Repository
        </h2>
        <p className=" text-sm text-zinc-500">
          The linked repository is used to associate branches with environments.{" "}
          <br />
          Updates pushed via CI will be associated with the correct environment
          based on the branch name.
        </p>
        {githubRepo ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">{currentRepo}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowRepoPicker(true)}
              >
                <EditIcon size={16} />
              </Button>
              <Button
                variant={"outline"}
                size="sm"
                className=" border-zinc-700 text-white hover:bg-zinc-800"
                onClick={() =>
                  window.open(
                    `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`,
                    "_blank",
                  )
                }
              >
                Can't see your repo?
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-white hover:bg-zinc-800"
              onClick={() => {
                setShowRepoPicker(true);
                if (!repos) refetchRepos();
              }}
            >
              Connect repository
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">
                Can't see your repo?
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-white hover:bg-zinc-800"
                onClick={() =>
                  window.open(
                    `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`,
                    "_blank",
                  )
                }
              >
                Install GitHub App
              </Button>
            </div>
          </div>
        )}

        {showRepoPicker && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-zinc-700 py-2">
            {repos === null ? (
              <p className="px-3 py-2 text-sm text-zinc-300">Loading...</p>
            ) : (
              repos.map((r) => (
                <button
                  key={r.fullName}
                  type="button"
                  className="w-full px-3 text-left text-sm text-zinc-300"
                  onClick={() => selectRepo(r.fullName)}
                >
                  <p className="w-full flex px-2  hover:bg-zinc-800 py-2 rounded-lg">
                    {r.fullName}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="">Name</TableHead>
              <TableHead className="">Branch</TableHead>
              <TableHead className="">Created</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {environments.map((env) => (
              <EditableRow
                key={env.id}
                env={env}
                onSaved={() => refetchEnvs()}
                onDeleted={() => refetchEnvs()}
              />
            ))}
            {environments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-zinc-600"
                >
                  No environments yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
