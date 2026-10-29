import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@otasifiy.local";

export async function GET(req: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Demo workspace is not seeded. Run `bun run seed:demo`." },
      { status: 503 },
    );
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  (await cookies()).set("session_token", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
