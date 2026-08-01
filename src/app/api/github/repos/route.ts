import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  if (!session?.user.githubToken) {
    return Response.json({ error: "No GitHub token" }, { status: 401 });
  }

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: { Authorization: `Bearer ${session.user.githubToken}` },
    },
  );

  if (!res.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const repos = await res.json();
  const list = repos.map(
    (r: { full_name: string; name: string; owner: { login: string } }) => ({
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
    }),
  );

  return Response.json(list);
}
