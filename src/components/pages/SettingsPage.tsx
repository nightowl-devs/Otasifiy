"use client";

import {
  CopyIcon,
  ExternalLinkIcon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/project-context";
import { useUpdateProject } from "@/hooks/use-projects";
import { slugify } from "@/lib/utils";

export function SettingsPage() {
  const { project } = useProject();
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [origin, setOrigin] = useState("");
  const updateProject = useUpdateProject();
  const DEFAULT_API_KEY = "**********************";
  const [newApiKey, setNewApiKey] = useState(
    project.apiKeyHash.startsWith("$argon2id")
      ? DEFAULT_API_KEY
      : project.apiKeyHash,
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleSave() {
    if (!name.trim() || !slug.trim()) return;
    setError("");
    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: name.trim(),
        slug: slug.trim(),
      });
    } catch (_e) {
      setError("Failed to save");
    }
  }

  async function copy(text: string, setter: (copied: boolean) => void) {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  async function handleRegenerateKey() {
    const data = await updateProject.mutateAsync({
      id: project.id,
      regenerateApiKey: true,
    });
    setNewApiKey(data.apiKeyHash);
  }

  const manifestUrl = `${origin}/api/manifest?slug=${project.slug}`;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-100">
            Project details
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="settings-name"
                className="mb-1 block text-xs text-zinc-500"
              >
                Name
              </label>
              <input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="settings-slug"
                className="mb-1 block text-xs text-zinc-500"
              >
                Slug
              </label>
              <input
                id="settings-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              disabled={!name.trim() || !slug.trim() || updateProject.isPending}
              onClick={handleSave}
            >
              <SaveIcon className="size-4 mr-1" />
              {updateProject.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-100">API key</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Use this key to authenticate update publishing.<br></br>
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-300">
              Authorization: Bearer &lt;API_KEY&gt;
            </code>
            .
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-300">
              {newApiKey}
            </code>
            <button
              type="button"
              onClick={() => copy(newApiKey, setCopiedApiKey)}
              disabled={newApiKey === DEFAULT_API_KEY}
              className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <CopyIcon className="size-4" />
            </button>
            {copiedApiKey && (
              <span className="shrink-0 text-xs text-green-400">Copied!</span>
            )}
          </div>
          <div className="flex flex-col gap-1 mt-2 text-sm">
            {newApiKey !== DEFAULT_API_KEY && (
              <span className="shrink-0 text-xs text-red-400">
                This key will be hidden after you leave this page. Make sure to
                copy it now!
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 self-start text-zinc-500 hover:text-zinc-300 flex"
              onClick={handleRegenerateKey}
            >
              <RotateCcwIcon className="size-3.5 mr-1  " />
              Regenerate
            </Button>
          </div>
        </div>
        {project.githubRepo && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-100">
              GitHub repository
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                {project.githubRepo}
              </span>
              <a
                href={`https://github.com/${project.githubRepo}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-100">
            Project info
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-300">
                  {project.id}
                </span>
                <button
                  type="button"
                  onClick={() => copy(project.id, setCopiedId)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <CopyIcon className="size-3.5" />
                </button>
                {copiedId && (
                  <span className="text-xs text-green-400">Copied!</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Manifest URL</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-300 max-w-64 truncate">
                  {manifestUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copy(manifestUrl, setCopiedManifest)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <CopyIcon className="size-3.5" />
                </button>
                {copiedManifest && (
                  <span className="text-xs text-green-400">Copied!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
