import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveGithubToken } from "@/lib/token-crypto";

export async function GET(req: Request) {
  const session = await requireSession();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json({ error: "Missing projectId." }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project?.githubRepo) {
    return Response.json(
      { error: "No repo connected to this project" },
      { status: 400 },
    );
  }

  if (!session.user.githubToken) {
    return Response.json({ error: "No GitHub token" }, { status: 401 });
  }

  const res = await fetch(
    `https://api.github.com/repos/${project.githubRepo}/branches?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${resolveGithubToken(session.user.githubToken)}`,
      },
    },
  );

  if (!res.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const branches = await res.json();
  const names = branches.map((b: { name: string }) => b.name);

  return Response.json(names);
}
