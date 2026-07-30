import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Invite = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: string;
  createdAt: string;
  invitedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

async function fetchInvites(projectId: string): Promise<Invite[]> {
  const res = await fetch(`/api/project/${projectId}/invites`);
  return res.json();
}

export function useInvites(projectId: string) {
  return useQuery({
    queryKey: ["project-invites", projectId],
    queryFn: () => fetchInvites(projectId),
    enabled: !!projectId,
  });
}

export function useCreateInvite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; role: "ADMIN" | "MEMBER" }) => {
      const res = await fetch(`/api/project/${projectId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create invite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-invites", projectId],
      });
    },
  });
}

export function useRevokeInvite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/project/${projectId}/invites?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke invite");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-invites", projectId],
      });
    },
  });
}
