import type { NextRequest } from "next/server";
import { getSessionFromRequest, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await requireSession();

  const body = await req.json();

  if (!body.token) {
    return Response.json({ error: "Missing token." }, { status: 400 });
  }

  const invite = await prisma.projectInvite.findUnique({
    where: { token: body.token },
  });

  if (!invite) {
    return Response.json({ error: "Invalid token." }, { status: 404 });
  }

  if (invite.status !== "PENDING") {
    return Response.json({ error: "Invite is not pending." }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return Response.json({ error: "Invite has expired." }, { status: 400 });
  }

  if (invite.email !== session.user.email) {
    return Response.json({ error: "This invite is for a different email." }, { status: 403 });
  }

  await prisma.projectMembership.create({
    data: {
      projectId: invite.projectId,
      userId: session.user.id,
      role: invite.role,
    },
  });

  await prisma.projectInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED" },
  });

  return Response.json({ ok: true });
}
