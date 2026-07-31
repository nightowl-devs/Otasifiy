"use client";

import {
  ChevronDownIcon,
  MoreHorizontalIcon,
  Plus,
  Trash2,
  UserRoundMinus,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useCreateInvite,
  useInvites,
  useRevokeInvite,
} from "@/hooks/use-invites";
import {
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/hooks/use-members";

function InviteDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const createInvite = useCreateInvite(projectId);

  async function handleInvite() {
    if (!email) return;
    await createInvite.mutateAsync({ email, role });
    setEmail("");
    setRole("MEMBER");
    setOpen(false);
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
            Invite member
          </Button>
        }
      />
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Send an invitation email to join this project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="mb-1 block text-xs text-zinc-500"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs text-zinc-500">Role</span>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as "ADMIN" | "MEMBER")}
            >
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-zinc-100">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-800 text-zinc-100">
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={!email || createInvite.isPending}
            onClick={handleInvite}
          >
            {createInvite.isPending ? "Inviting..." : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    OWNER: "border-red-700 text-red-400 bg-red-950/30",
    ADMIN: "border-yellow-700 text-yellow-400 bg-yellow-950/30",
    MEMBER: "border-blue-700 text-blue-400 bg-blue-950/30",
  };
  return (
    <Badge
      variant="outline"
      className={colors[role] ?? "border-zinc-700 text-zinc-400"}
    >
      {role}
    </Badge>
  );
}

export function TeamPage() {
  const { project } = useProject();
  const { data: members = [] } = useMembers(project.id);
  const { data: invites = [] } = useInvites(project.id);
  const changeRole = useUpdateMemberRole(project.id);
  const removeMember = useRemoveMember(project.id);
  const revokeInvite = useRevokeInvite(project.id);
  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Team</h1>
        <InviteDialog projectId={project.id} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Name</TableHead>
              <TableHead className="text-zinc-400">Email</TableHead>
              <TableHead className="text-zinc-400">Role</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow
                key={member.id}
                className="border-zinc-800 hover:bg-zinc-800/30"
              >
                <TableCell className="text-zinc-100">
                  {member.user.firstName} {member.user.lastName}
                </TableCell>
                <TableCell className="text-zinc-400">
                  {member.user.email}
                </TableCell>
                <TableCell>
                  <RoleBadge role={member.role} />
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
                      {member.role === "OWNER" ? (
                        <DropdownMenuItem disabled>
                          <UserRoundMinus className="size-4" />
                          Owner
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              changeRole.mutate({
                                userId: member.userId,
                                role: "ADMIN",
                              })
                            }
                            disabled={changeRole.isPending}
                          >
                            <ChevronDownIcon className="size-4" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              changeRole.mutate({
                                userId: member.userId,
                                role: "MEMBER",
                              })
                            }
                            disabled={changeRole.isPending}
                          >
                            <ChevronDownIcon className="size-4" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => removeMember.mutate(member.userId)}
                          >
                            <Trash2 className="size-4" />
                            Remove
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-zinc-600"
                >
                  No members yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {invites.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-100">
            Pending invites
          </h2>
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Role</TableHead>
                  <TableHead className="text-zinc-400">Invited by</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow
                    key={invite.id}
                    className="border-zinc-800 hover:bg-zinc-800/30"
                  >
                    <TableCell className="text-zinc-100">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={invite.role} />
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {invite.invitedBy.firstName} {invite.invitedBy.lastName}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-zinc-500 hover:text-red-400"
                        onClick={() => revokeInvite.mutate(invite.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
