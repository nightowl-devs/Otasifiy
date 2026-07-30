import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json(
      { error: "Missing projectId query param." },
      { status: 400 },
    );
  }

  const access = await checkProjectAccess(req, projectId, "MEMBER");
  if (access instanceof Response) return access;

  const environments = await prisma.environment.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
    include: { _count: { select: { updates: true } } },
  });

  return Response.json(environments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name || !body.branch) {
    return Response.json({ error: "Missing name or branch." }, { status: 400 });
  }

  if (!body.projectId) {
    return Response.json({ error: "Missing projectId." }, { status: 400 });
  }

  const access = await checkProjectAccess(req, body.projectId, "ADMIN");
  if (access instanceof Response) return access;

  try {
    const env = await prisma.environment.create({
      data: {
        name: body.name,
        branch: body.branch,
        project: { connect: { id: body.projectId } },
      },
    });
    return Response.json(env, { status: 201 });
  } catch {
    return Response.json(
      { error: "Environment name already exists in this project." },
      { status: 409 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();

  if (!body.id) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }

  const env = await prisma.environment.findUnique({
    where: { id: body.id },
  });

  if (!env) {
    return Response.json({ error: "Environment not found." }, { status: 404 });
  }

  const access = await checkProjectAccess(req, env.projectId!, "ADMIN");
  if (access instanceof Response) return access;

  await prisma.update.deleteMany({ where: { environmentId: body.id } });
  await prisma.environment.delete({ where: { id: body.id } });

  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (!body.id || !body.name || !body.branch) {
    return Response.json(
      { error: "Missing id, name, or branch." },
      { status: 400 },
    );
  }

  const env = await prisma.environment.findUnique({
    where: { id: body.id },
  });

  if (!env) {
    return Response.json({ error: "Environment not found." }, { status: 404 });
  }

  const access = await checkProjectAccess(req, env.projectId!, "ADMIN");
  if (access instanceof Response) return access;

  const updated = await prisma.environment.update({
    where: { id: body.id },
    data: { name: body.name, branch: body.branch },
  });

  return Response.json(updated);
}
