import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function GET(req: NextRequest) {
  // biome-ignore lint/style/noNonNullAssertion: proxy already validated session
  const session = (await getSessionFromRequest(req))!;

  const projects = await prisma.project.findMany({
    where: { memberships: { some: { userId: session.user.id } } },
    orderBy: { id: "asc" },
    include: { _count: { select: { environments: true, updates: true } } },
  });

  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  // biome-ignore lint/style/noNonNullAssertion: proxy already validated session
  const session = (await getSessionFromRequest(req))!;

  const body = await req.json();

  if (!body.name) {
    return Response.json({ error: "Missing name." }, { status: 400 });
  }

  let slug = body.slug ? slugify(body.slug) : slugify(body.name);
  if (!slug) slug = `project-${Date.now()}`;

  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const project = await prisma.project.create({
    data: {
      name: body.name,
      slug,
      apiKeyHash: await Bun.password.hash(generateApiKey()),
      githubRepo: body.githubRepo ?? null,
      user: { connect: { id: session.user.id } },
      memberships: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return Response.json(project, { status: 201 });
}
