import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "ADMIN");
  if (access instanceof Response) return access;

  const invites = await prisma.projectInvite.findMany({
    where: { projectId: id, status: "PENDING" },
    include: {
      invitedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invites);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "ADMIN");
  if (access instanceof Response) return access;

  const body = await req.json();

  const emailResult = z.email().safeParse(body.email);
  if (!emailResult.success) {
    return Response.json({ error: "Invalid email format." }, { status: 400 });
  }

  if (!body.role) {
    return Response.json({ error: "Missing role." }, { status: 400 });
  }

  if (body.role === "OWNER") {
    return Response.json(
      { error: "Cannot invite with OWNER role." },
      { status: 400 },
    );
  }

  const invite = await prisma.projectInvite.create({
    data: {
      projectId: id,
      email: body.email,
      role: body.role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedById: access.session.user.id,
    },
  });

  return Response.json(invite, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "ADMIN");
  if (access instanceof Response) return access;

  const { searchParams } = req.nextUrl;
  const inviteId = searchParams.get("id");

  if (!inviteId) {
    return Response.json({ error: "Missing id query param." }, { status: 400 });
  }

  await prisma.projectInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  });

  return Response.json({ ok: true });
}
