import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) {
    return Response.json({ error: "Missing session cookie." }, { status: 401 });
  }

  const session = await prisma.session.findUnique({
    where: { token, expiresAt: { gt: new Date() } },
  });

  if (!session) {
    return Response.json(
      { error: "Session is invalid or expired." },
      { status: 401 },
    );
  }

  return Response.json({ message: "Session is valid" }, { status: 200 });
}
