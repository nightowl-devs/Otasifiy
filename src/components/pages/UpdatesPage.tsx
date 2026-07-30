"use client";

import {
  EyeIcon,
  MoreHorizontalIcon,
  PowerIcon,
  PowerOffIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProject } from "@/context/project-context";
import type { Prisma } from "@/generated/prisma";
import { useEnvironments } from "@/hooks/use-environments";
import { usePatchUpdate, useUpdates } from "@/hooks/use-updates";

type UpdateWithIncludes = Prisma.UpdateGetPayload<{
  include: {
    environment: true;
    manifests: {
      include: {
        assets: true;
        launchAsset: true;
      };
    };
  };
}>;

function UpdateDetailDialog({
  update,
  environments,
  open,
  onOpenChange,
  onUpdated,
}: {
  update: UpdateWithIncludes;
  environments: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (u: UpdateWithIncludes) => void;
}) {
  const [deployPercent, setDeployPercent] = useState(update.deployPercent);
  const patchUpdate = usePatchUpdate(update.id);

  async function saveDeployPercent() {
    const updated = await patchUpdate.mutateAsync({ deployPercent });
    onUpdated(updated);
  }

  async function toggleDisabled() {
    const updated = await patchUpdate.mutateAsync({
      disabled: !update.disabled,
    });
    onUpdated(updated);
  }

  async function changeEnvironment(environmentId: string) {
    const updated = await patchUpdate.mutateAsync({ environmentId });
    onUpdated(updated);
  }

  const totalAssets = update.manifests.reduce(
    (s, m) => s + m.assets.length + (m.launchAsset ? 1 : 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update {update.version}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-xs">{update.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>{update.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environment</span>
            <div className="flex items-center gap-2">
              <select
                value={update.environmentId}
                onChange={(e) => changeEnvironment(e.target.value)}
                className="rounded border border-input bg-transparent px-2 py-0.5 text-sm"
                disabled={patchUpdate.isPending}
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Commit</span>
            <span className="font-mono text-xs">{update.commit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(update.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <span>{update.disabled ? "Disabled" : "Active"}</span>
              <Switch
                checked={!update.disabled}
                onCheckedChange={toggleDisabled}
                disabled={patchUpdate.isPending}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Manifests</span>
            <span>{update.manifests.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assets</span>
            <span>{totalAssets}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rollout</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={deployPercent}
                onChange={(e) => setDeployPercent(Number(e.target.value))}
                className="w-28 h-1.5 cursor-pointer accent-zinc-100"
                disabled={patchUpdate.isPending}
              />
              <input
                type="number"
                min="0"
                max="100"
                value={deployPercent}
                onChange={(e) =>
                  setDeployPercent(
                    Math.min(100, Math.max(0, Number(e.target.value))),
                  )
                }
                className="w-14 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-sm text-zinc-100 text-center"
                disabled={patchUpdate.isPending}
              />
              <Button
                variant="outline"
                size="xs"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                disabled={
                  patchUpdate.isPending ||
                  deployPercent === update.deployPercent
                }
                onClick={saveDeployPercent}
              >
                {patchUpdate.isPending ? "..." : "Save"}
              </Button>
            </div>
          </div>
          {update.manifests.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline">{m.platform}</Badge>
                <span className="text-xs text-muted-foreground">
                  {m.runtimeVersion}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {m.assets.length + (m.launchAsset ? 1 : 0)} assets
                {m.launchAsset && " (includes launch asset)"}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export function UpdatesPage() {
  const { project } = useProject();
  const { data: updates = [], isLoading } = useUpdates(project.id);
  const { data: environments = [] } = useEnvironments(project.id);
  const [detailUpdate, setDetailUpdate] = useState<UpdateWithIncludes | null>(
    null,
  );

  function handleUpdated(updated: UpdateWithIncludes) {
    setDetailUpdate(updated);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Updates</h1>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800 p-8">
          <p className="text-center text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Updates</h1>
          <span className="text-sm text-zinc-500">{updates.length} total</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Version</TableHead>
                <TableHead className="text-zinc-400">Environment</TableHead>
                <TableHead className="text-zinc-400">Created</TableHead>
                <TableHead className="text-zinc-400">Commit</TableHead>
                <TableHead className="text-zinc-400">Rollout</TableHead>
                <TableHead className="text-zinc-400">Manifests</TableHead>
                <TableHead className="text-zinc-400">Assets</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-zinc-600"
                  >
                    No updates yet.
                  </TableCell>
                </TableRow>
              )}
              {updates.map((update) => {
                const totalAssets = update.manifests.reduce(
                  (s, m) => s + m.assets.length + (m.launchAsset ? 1 : 0),
                  0,
                );
                return (
                  <TableRow
                    key={update.id}
                    className="border-zinc-800 hover:bg-zinc-800/30"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            update.disabled ? "text-zinc-500" : "text-zinc-100"
                          }
                        >
                          {update.version}
                        </span>
                        {update.disabled && (
                          <Badge
                            variant="outline"
                            className="border-zinc-700 text-zinc-500"
                          >
                            disabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          update.environment.name === "production"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {update.environment.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(update.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-zinc-400">
                        {update.commit.slice(0, 7)}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {update.deployPercent}%
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {update.manifests.length}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {totalAssets}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-zinc-500 hover:text-zinc-300"
                            />
                          }
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDetailUpdate(update)}
                          >
                            <EyeIcon className="size-4" />
                            View details
                          </DropdownMenuItem>
                          {environments
                            .filter((e) => e.id !== update.environmentId)
                            .map((env) => (
                              <DropdownMenuItem
                                key={env.id}
                                onClick={async () => {
                                  const res = await fetch(
                                    `/api/update/${update.id}`,
                                    {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        environmentId: env.id,
                                      }),
                                    },
                                  );
                                  if (res.ok) {
                                    const updated = await res.json();
                                    handleUpdated(updated);
                                  }
                                }}
                              >
                                <RefreshCwIcon className="size-4" />
                                Move to {env.name}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuItem
                            onClick={async () => {
                              const res = await fetch(
                                `/api/update/${update.id}`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    disabled: !update.disabled,
                                  }),
                                },
                              );
                              if (res.ok) {
                                const updated = await res.json();
                                handleUpdated(updated);
                              }
                            }}
                          >
                            {update.disabled ? (
                              <>
                                <PowerIcon className="size-4" />
                                Enable
                              </>
                            ) : (
                              <>
                                <PowerOffIcon className="size-4" />
                                Disable
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      {detailUpdate && (
        <UpdateDetailDialog
          update={detailUpdate}
          environments={environments}
          open={!!detailUpdate}
          onOpenChange={(open) => {
            if (!open) setDetailUpdate(null);
          }}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
