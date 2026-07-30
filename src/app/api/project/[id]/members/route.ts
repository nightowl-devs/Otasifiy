import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "MEMBER");
  if (access instanceof Response) return access;

  const memberships = await prisma.projectMembership.findMany({
    where: { projectId: id },
    include: { user: { select: userSelect } },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(memberships);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "ADMIN");
  if (access instanceof Response) return access;

  const body = await req.json();

  if (!body.userId || !body.role) {
    return Response.json({ error: "Missing userId or role." }, { status: 400 });
  }

  if (body.role === "OWNER") {
    return Response.json(
      { error: "Cannot grant OWNER role." },
      { status: 400 },
    );
  }

  const membership = await prisma.projectMembership.create({
    data: {
      projectId: id,
      userId: body.userId,
      role: body.role,
    },
    include: { user: { select: userSelect } },
  });

  return Response.json(membership, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "OWNER");
  if (access instanceof Response) return access;

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json(
      { error: "Missing userId query param." },
      { status: 400 },
    );
  }

  const membership = await prisma.projectMembership.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });

  if (!membership) {
    return Response.json({ error: "Membership not found." }, { status: 404 });
  }

  if (membership.role === "OWNER") {
    const ownerCount = await prisma.projectMembership.count({
      where: { projectId: id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return Response.json(
        { error: "Cannot remove the last OWNER." },
        { status: 400 },
      );
    }
  }

  await prisma.projectMembership.delete({
    where: { projectId_userId: { projectId: id, userId } },
  });

  return Response.json({ ok: true });
}
