"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useCreateProject } from "@/hooks/use-projects";
import { slugify } from "@/lib/utils";

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createProject = useCreateProject();

  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(slugify(value));
  }

  async function handleCreate() {
    if (!name.trim() || !slug) return;
    setError("");
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        slug,
      });
      if (project.apiKey) {
        setCreatedApiKey(project.apiKey);
        return;
      }
      setName("");
      setSlug("");
      setSlugEdited(false);
      setOpen(false);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  }

  function handleCloseAfterKey() {
    setCreatedApiKey(null);
    setCopied(false);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setOpen(false);
    onCreated?.();
  }

  if (open === undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <Plus size={14} className="mr-1" />
              Create project
            </Button>
          }
        />
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {createdApiKey ? "Save your API key" : "Create project"}
            </DialogTitle>
            <DialogDescription>
              {createdApiKey
                ? "This is the only time you'll see it. Copy it now."
                : "Give your project a name to get started."}
            </DialogDescription>
          </DialogHeader>
          {createdApiKey ? (
            <div className="space-y-4">
              <code className="block truncate rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100">
                {createdApiKey}
              </code>
              {copied && (
                <p className="text-xs text-green-400">Copied to clipboard!</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-1 block text-xs text-zinc-500"
                >
                  Project name
                </label>
                <input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My App"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
                />
              </div>
              <div>
                <label
                  htmlFor="project-slug"
                  className="mb-1 block text-xs text-zinc-500"
                >
                  Slug
                </label>
                <input
                  id="project-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-app"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 font-mono"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}
          <DialogFooter>
            {createdApiKey ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdApiKey);
                    setCopied(true);
                  }}
                >
                  Copy key
                </Button>
                <Button
                  size="sm"
                  className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
                  onClick={handleCloseAfterKey}
                >
                  Done
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
                disabled={!name.trim() || !slug || createProject.isPending}
                onClick={handleCreate}
              >
                {createProject.isPending ? "Creating..." : "Create"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {createdApiKey ? "Save your API key" : "Create project"}
          </DialogTitle>
          <DialogDescription>
            {createdApiKey
              ? "This is the only time you'll see it. Copy it now."
              : "Give your project a name to get started."}
          </DialogDescription>
        </DialogHeader>
        {createdApiKey ? (
          <div className="space-y-4">
            <code className="block truncate rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100">
              {createdApiKey}
            </code>
            {copied && (
              <p className="text-xs text-green-400">Copied to clipboard!</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="project-name"
                className="mb-1 block text-xs text-zinc-500"
              >
                Project name
              </label>
              <input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My App"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="project-slug"
                className="mb-1 block text-xs text-zinc-500"
              >
                Slug
              </label>
              <input
                id="project-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-app"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 font-mono"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
        <DialogFooter>
          {createdApiKey ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={async () => {
                  await navigator.clipboard.writeText(createdApiKey);
                  setCopied(true);
                }}
              >
                Copy key
              </Button>
              <Button
                size="sm"
                className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
                onClick={handleCloseAfterKey}
              >
                Done
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
              disabled={!name.trim() || !slug || createProject.isPending}
              onClick={handleCreate}
            >
              {createProject.isPending ? "Creating..." : "Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
