import { type NextRequest, NextResponse } from "next/server";
import type {
  Project,
  ProjectMembership,
  ProjectRole,
  Session,
  User,
} from "@/generated/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ROLE_RANK: Record<ProjectRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

export async function getMembership(
  userId: string,
  projectId: string,
): Promise<ProjectMembership | null> {
  return prisma.projectMembership.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export function canAccess(role: ProjectRole, minRole: ProjectRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

type SessionWithUser = Session & { user: User };

type ProjectAccessSuccess = {
  session: SessionWithUser;
  membership: ProjectMembership;
  project: Project;
};

export async function checkProjectAccess(
  req: NextRequest,
  projectId: string,
  minRole: ProjectRole,
): Promise<ProjectAccessSuccess | NextResponse> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [membership, project] = await Promise.all([
    getMembership(session.user.id, projectId),
    prisma.project.findUnique({ where: { id: projectId } }),
  ]);

  if (!project || !membership || !canAccess(membership.role, minRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { session, membership, project };
}
