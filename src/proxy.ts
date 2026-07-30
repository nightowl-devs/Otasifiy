import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUBLIC_ROUTES = [
  "/login",
  "/api/auth/github",
  "/api/auth/github/callback",
  "/api/asset",
  "/api/manifest",
  "/api/status",
];

const DASHBOARD_PAGES = [
  "/dashboard/updates",
  "/dashboard/environments",
  "/dashboard/analytics",
  "/dashboard/team",
  "/dashboard/settings",
];

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_ROUTES.some(
      (p) => pathname === p || (p !== "/login" && pathname.startsWith(`${p}/`)),
    )
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  const session = await prisma.session.findUnique({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true },
  });

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if (
    DASHBOARD_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const projectCount = await prisma.projectMembership.count({
      where: { userId: session.userId },
    });
    if (projectCount === 0) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}
