import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

export async function POST(req: NextRequest) {
  const { repo, projectId } = await req.json();
  if (!repo) {
    return Response.json({ error: "Missing repo." }, { status: 400 });
  }

  if (!projectId) {
    return Response.json({ error: "Missing projectId." }, { status: 400 });
  }

  const access = await checkProjectAccess(req, projectId, "ADMIN");
  if (access instanceof Response) return access;

  const proj = await prisma.project.update({
    where: { id: projectId },
    data: { githubRepo: repo },
  });

  return NextResponse.json({ proj });
}
