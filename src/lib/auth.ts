import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { Session, User } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

type SessionWithUser = Session & { user: User };

export async function getSession(): Promise<SessionWithUser | null> {
  const cookie = (await cookies()).get("session_token");
  if (!cookie) return null;

  const session = await prisma.session.findUnique({
    where: {
      token: cookie.value,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  return session;
}

export async function requireSession(): Promise<SessionWithUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionWithUser | null> {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  return session;
}
