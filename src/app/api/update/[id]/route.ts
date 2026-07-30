import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

const deployPercentSchema = z.number().int().min(0).max(100);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.update.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Update not found." }, { status: 404 });
  }

  if (!existing.projectId) {
    return Response.json(
      { error: "Update has no project association." },
      { status: 400 },
    );
  }

  const access = await checkProjectAccess(req, existing.projectId, "ADMIN");
  if (access instanceof Response) return access;

  const data: Record<string, unknown> = {};

  if (typeof body.disabled === "boolean") {
    data.disabled = body.disabled;
  }

  if (body.environmentId) {
    const env = await prisma.environment.findUnique({
      where: { id: body.environmentId },
    });
    if (!env) {
      return Response.json(
        { error: "Environment not found." },
        { status: 400 },
      );
    }
    data.environment = { connect: { id: body.environmentId } };
  }

  if (body.deployPercent !== undefined) {
    const result = deployPercentSchema.safeParse(body.deployPercent);
    if (!result.success) {
      return Response.json(
        { error: "deployPercent must be an integer between 0 and 100." },
        { status: 400 },
      );
    }
    data.deployPercent = result.data;
  }

  const updated = await prisma.update.update({
    where: { id },
    data,
    include: {
      environment: true,
      manifests: {
        include: {
          assets: true,
          launchAsset: true,
        },
      },
    },
  });

  return Response.json(updated);
}
