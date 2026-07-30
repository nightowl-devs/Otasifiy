import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).get("session_token")!;

  await prisma.session.deleteMany({ where: { token: cookie.value } });

  const response = NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"),
  );
  response.cookies.set("session_token", "", { maxAge: 0, path: "/" });

  return response;
}
