import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const cookie = (await cookies()).get("session_token")!;
  const session = await prisma.session.findUnique({
    where: { token: cookie.value, expiresAt: { gt: new Date() } },
    include: { user: true },
  })!;

  if (!session?.user.githubToken) {
    return Response.json({ error: "No GitHub token" }, { status: 401 });
  }

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

  const res = await fetch(
    `https://api.github.com/repos/${project.githubRepo}/branches?per_page=100`,
    {
      headers: { Authorization: `Bearer ${session.user.githubToken}` },
    },
  );

  if (!res.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const branches = await res.json();
  const names = branches.map((b: { name: string }) => b.name);

  return Response.json(names);
}
