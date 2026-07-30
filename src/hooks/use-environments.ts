import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type EnvironmentWithCount = {
  id: string;
  name: string;
  branch: string;
  createdAt: Date;
  _count: { updates: number };
};

type Repo = { fullName: string; name: string; owner: string };

async function fetchEnvironments(
  projectId: string,
): Promise<EnvironmentWithCount[]> {
  const res = await fetch(`/api/environment?projectId=${projectId}`);
  return res.json();
}

export function useEnvironments(projectId: string) {
  return useQuery({
    queryKey: ["environments", projectId],
    queryFn: () => fetchEnvironments(projectId),
    enabled: !!projectId,
  });
}

export function useCreateEnvironment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; branch: string }) => {
      const res = await fetch("/api/environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      if (!res.ok) throw new Error("Failed to create environment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", projectId] });
    },
  });
}

export function useDeleteEnvironment(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/environment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete environment");
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["environments", projectId],
        });
      }
    },
  });
}

export function useUpdateEnvironment(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      const res = await fetch("/api/environment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update environment");
      return res.json();
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["environments", projectId],
        });
      }
    },
  });
}

export function useGitHubBranches(projectId: string) {
  return useQuery({
    queryKey: ["github-branches", projectId],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(`/api/github/branches?projectId=${projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!projectId,
    retry: false,
  });
}

export function useGitHubRepos() {
  return useQuery({
    queryKey: ["github-repos"],
    queryFn: async (): Promise<Repo[]> => {
      const res = await fetch("/api/github/repos");
      return res.json();
    },
    staleTime: 0,
    retry: false,
  });
}
