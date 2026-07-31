import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";
import { generateApiKey } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "ADMIN");
  if (access instanceof Response) return access;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  let newApiKey: string | undefined;

  if (body.name !== undefined) data.name = body.name;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.githubRepo !== undefined) data.githubRepo = body.githubRepo;
  if (body.regenerateApiKey) {
    newApiKey = generateApiKey();
    data.apiKeyHash = await Bun.password.hash(newApiKey);
  }

  if (data.slug) {
    const existing = await prisma.project.findUnique({
      where: { slug: data.slug as string },
    });
    if (existing && existing.id !== id) {
      return Response.json({ error: "Slug already taken." }, { status: 409 });
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data,
  });

  if (newApiKey) return Response.json({ ...updated, apiKeyHash: newApiKey });

  return Response.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const access = await checkProjectAccess(req, id, "OWNER");
  if (access instanceof Response) return access;

  await prisma.manifest.deleteMany({
    where: { update: { projectId: id } },
  });
  await prisma.update.deleteMany({ where: { projectId: id } });
  await prisma.environment.deleteMany({ where: { projectId: id } });
  await prisma.project.delete({ where: { id } });

  return Response.json({ ok: true });
}
