import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

const rangeSchema = z.enum(["7d", "30d", "90d", "lifetime"]);

type Range = z.infer<typeof rangeSchema>;

const RANGE_DAYS: Record<Exclude<Range, "lifetime">, number> = {
  "7d": 6,
  "30d": 29,
  "90d": 89,
};

function rangeStart(range: Range): Date | null {
  if (range === "lifetime") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - RANGE_DAYS[range]);
  return now;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfPrevMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json(
      { error: "Missing projectId query param." },
      { status: 400 },
    );
  }

  const rangeResult = rangeSchema.safeParse(searchParams.get("range") ?? "7d");
  if (!rangeResult.success) {
    return Response.json(
      { error: "Invalid range. Must be one of 7d, 30d, 90d, lifetime." },
      { status: 400 },
    );
  }
  const range = rangeResult.data;

  const access = await checkProjectAccess(req, projectId, "MEMBER");
  if (access instanceof Response) return access;

  const start = rangeStart(range);
  const where = start
    ? { projectId, createdAt: { gte: start } }
    : { projectId };
  const dateFilter = start
    ? Prisma.sql`AND "createdAt" >= ${start}`
    : Prisma.empty;

  const monthStart = startOfMonth(new Date());
  const prevMonthStart = startOfPrevMonth(new Date());

  const [
    totalDownloads,
    periodCount,
    monthDownloads,
    prevMonthDownloads,
    daily,
    monthly,
    platforms,
    runtimes,
  ] = await Promise.all([
    prisma.download.count({ where: { projectId } }),
    prisma.download.count({ where }),
    prisma.download.count({
      where: { projectId, createdAt: { gte: monthStart } },
    }),
    prisma.download.count({
      where: { projectId, createdAt: { gte: prevMonthStart, lt: monthStart } },
    }),
    prisma.$queryRaw<{ date: string; downloads: number }[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
             count(*)::int AS downloads
      FROM "Download"
      WHERE "projectId" = ${projectId}
      ${dateFilter}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ month: string; downloads: number }[]>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
             count(*)::int AS downloads
      FROM "Download"
      WHERE "projectId" = ${projectId}
      ${dateFilter}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.download.groupBy({
      by: ["platform"],
      where,
      _count: { _all: true },
    }),
    prisma.download.groupBy({
      by: ["runtimeVersion"],
      where,
      _count: { _all: true },
    }),
  ]);

  return Response.json({
    totals: {
      totalDownloads,
      monthDownloads,
      monthDeltaPct: percentChange(monthDownloads, prevMonthDownloads),
    },
    daily,
    monthly,
    platforms: platforms.map((p) => ({
      platform: p.platform,
      users: p._count._all,
    })),
    runtimes: runtimes.map((r) => ({
      version: r.runtimeVersion,
      pct:
        periodCount > 0
          ? Math.round((r._count._all / periodCount) * 1000) / 10
          : 0,
    })),
  });
}
