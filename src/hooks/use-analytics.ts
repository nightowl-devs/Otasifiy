import { useQuery } from "@tanstack/react-query";

export type AnalyticsRange = "7d" | "30d" | "90d" | "lifetime";

export type AnalyticsResponse = {
  totals: {
    totalDownloads: number;
    monthDownloads: number;
    monthDeltaPct: number | null;
  };
  daily: { date: string; downloads: number }[];
  monthly: { month: string; downloads: number }[];
  platforms: { platform: "ios" | "android"; users: number }[];
  runtimes: { version: string; pct: number }[];
};

async function fetchAnalytics(
  projectId: string,
  range: AnalyticsRange,
): Promise<AnalyticsResponse> {
  const res = await fetch(
    `/api/analytics?projectId=${projectId}&range=${range}`,
  );
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export function useAnalytics(projectId: string, range: AnalyticsRange) {
  return useQuery({
    queryKey: ["analytics", projectId, range],
    queryFn: () => fetchAnalytics(projectId, range),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}
