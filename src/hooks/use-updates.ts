import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Prisma } from "@/generated/prisma";

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

async function fetchUpdates(
  projectId: string,
  params?: { environmentId?: string; disabled?: boolean },
): Promise<UpdateWithIncludes[]> {
  const searchParams = new URLSearchParams({ projectId });
  if (params?.environmentId)
    searchParams.set("environmentId", params.environmentId);
  if (params?.disabled !== undefined)
    searchParams.set("disabled", String(params.disabled));
  const res = await fetch(`/api/update?${searchParams.toString()}`);
  return res.json();
}

export function useUpdates(
  projectId: string,
  params?: { environmentId?: string; disabled?: boolean },
) {
  return useQuery({
    queryKey: ["updates", projectId, params],
    queryFn: () => fetchUpdates(projectId, params),
    enabled: !!projectId,
  });
}

export function usePatchUpdate(updateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Partial<{
        deployPercent: number;
        disabled: boolean;
        environmentId: string;
      }>,
    ) => {
      const res = await fetch(`/api/update/${updateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update update");
      return res.json() as Promise<UpdateWithIncludes>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
    },
  });
}
