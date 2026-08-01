"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/context/project-context";
import { type AnalyticsRange, useAnalytics } from "@/hooks/use-analytics";

const monthlyConfig = {
  downloads: { label: "Downloads", color: "#3b82f6" },
} satisfies ChartConfig;

const dailyConfig = {
  downloads: { label: "Downloads", color: "#a855f7" },
} satisfies ChartConfig;

const platformConfig = {
  ios: { label: "iOS", color: "#a855f7" },
  android: { label: "Android", color: "#22c55e" },
} satisfies ChartConfig;

const runtimeConfig = {
  pct: { label: "Users", color: "#f59e0b" },
} satisfies ChartConfig;

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "lifetime", label: "Lifetime" },
];

const RANGE_DAYS: Partial<Record<AnalyticsRange, number>> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fillDailySeries(
  daily: { date: string; downloads: number }[],
  range: AnalyticsRange,
): { date: string; downloads: number }[] {
  const days = RANGE_DAYS[range];
  if (!days) return daily;

  const counts = new Map(daily.map((d) => [d.date, d.downloads]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - i));
    const key = localDayKey(date);
    return { date: key, downloads: counts.get(key) ?? 0 };
  });
}

function fillMonthlySeries(
  monthly: { month: string; downloads: number }[],
): { month: string; downloads: number }[] {
  if (monthly.length === 0) return [];

  const counts = new Map(monthly.map((m) => [m.month, m.downloads]));
  const [startY, startM] = monthly[0].month.split("-").map(Number);
  const [endY, endM] = monthly[monthly.length - 1].month.split("-").map(Number);

  const out: { month: string; downloads: number }[] = [];
  let year = startY;
  let month = startM;

  while (year < endY || (year === endY && month <= endM)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    out.push({ month: key, downloads: counts.get(key) ?? 0 });
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return out;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function formatDayLabel(date: string, range: AnalyticsRange): string {
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d);
  if (range === "7d") {
    return label.toLocaleDateString("en-US", { weekday: "short" });
  }
  return label.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function deltaLabel(pct: number | null | undefined, suffix: string): string {
  if (pct === null || pct === undefined) return "No previous data";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct}% ${suffix}`;
}

interface AnalyticsTimeRangePickerProps {
  currentRange: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

export function AnalyticsTimeRangePicker({
  currentRange,
  onChange,
}: AnalyticsTimeRangePickerProps) {
  const activeIndex = RANGES.findIndex((range) => range.value === currentRange);
  const offset =
    activeIndex === RANGES.length - 1
      ? "- 0.250rem"
      : activeIndex === 0
        ? "+ 0.250rem"
        : "";

  return (
    <div className="relative inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
      <div
        className="absolute top-1 bottom-1 rounded-md bg-white transition-all duration-300 ease-out"
        style={{
          width: `${100 / RANGES.length}%`,
          left: `calc(${activeIndex * (100 / RANGES.length)}% ${offset})`,
        }}
      />

      {RANGES.map((range) => {
        const active = currentRange === range.value;

        return (
          <button
            key={range.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(range.value)}
            className={`relative w-22 z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: string;
}) {
  const positive = delta.startsWith("+");
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
      <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <div className="flex items-center gap-1 mt-1">
        {positive ? (
          <TrendingUp size={14} className="text-emerald-400" />
        ) : (
          <TrendingDown size={14} className="text-red-400" />
        )}
        <span
          className={`text-xs ${positive ? "text-emerald-400" : "text-red-400"}`}
        >
          {delta}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { project } = useProject();
  const [timeRange, setTimeRange] = useState<AnalyticsRange>("7d");
  const { data, isLoading, isError, refetch } = useAnalytics(
    project.id,
    timeRange,
  );

  const monthly = useMemo(
    () => (data ? fillMonthlySeries(data.monthly) : []),
    [data],
  );
  const daily = useMemo(
    () => (data ? fillDailySeries(data.daily, timeRange) : []),
    [data, timeRange],
  );
  const platformData = useMemo(
    () =>
      data?.platforms.map((p) => ({
        platform: p.platform,
        users: p.users,
        fill: `var(--color-${p.platform})`,
      })) ?? [],
    [data],
  );
  const runtimeData = useMemo(() => data?.runtimes.slice(0, 8) ?? [], [data]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/80 p-8">
          <p className="text-zinc-300">Failed to load analytics.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100 ">Analytics</h1>
        <AnalyticsTimeRangePicker
          currentRange={timeRange}
          onChange={(range) => setTimeRange(range)}
        />
      </div>

      {data.totals.totalDownloads === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/80 p-16 text-center">
          <p className="text-zinc-300">No downloads yet.</p>
          <p className="text-zinc-500 text-sm">
            Publish an update and connect a client — download activity will show
            up here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard
              label="Total Downloads"
              value={data.totals.totalDownloads}
              delta={deltaLabel(data.totals.monthDeltaPct, "this month")}
            />
            <StatCard
              label="Downloads This Month"
              value={data.totals.monthDownloads}
              delta={deltaLabel(data.totals.monthDeltaPct, "vs last month")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
              <h2 className="text-base font-semibold text-zinc-100 mb-4">
                Monthly Downloads
              </h2>
              <ChartContainer config={monthlyConfig} className="h-64 w-full">
                <BarChart data={monthly}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    stroke="#a1a1aa"
                    tickFormatter={formatMonthLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    stroke="#a1a1aa"
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideIndicator />}
                  />
                  <Bar
                    dataKey="downloads"
                    fill="var(--color-downloads)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
              <h2 className="text-base font-semibold text-zinc-100 mb-4">
                Daily Downloads
              </h2>
              <ChartContainer config={dailyConfig} className="h-64 w-full">
                <LineChart data={daily}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    stroke="#a1a1aa"
                    tickFormatter={(v) => formatDayLabel(v, timeRange)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    stroke="#a1a1aa"
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideIndicator />}
                  />
                  <Line
                    type="monotone"
                    dataKey="downloads"
                    stroke="var(--color-downloads)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
              <h2 className="text-base font-semibold text-zinc-100 mb-4">
                Platform Distribution
              </h2>
              <ChartContainer config={platformConfig} className="h-64 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={platformData}
                    dataKey="users"
                    nameKey="platform"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    <LabelList
                      dataKey="platform"
                      className="fill-zinc-300 font-medium"
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
              <h2 className="text-base font-semibold text-zinc-100 mb-4">
                Runtime Versions
              </h2>
              <ChartContainer config={runtimeConfig} className="h-64 w-full">
                <BarChart data={runtimeData} layout="vertical">
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    stroke="#a1a1aa"
                    unit="%"
                  />
                  <YAxis
                    dataKey="version"
                    type="category"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    stroke="#a1a1aa"
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideIndicator />}
                  />
                  <Bar
                    dataKey="pct"
                    fill="var(--color-pct)"
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="pct"
                      position="right"
                      className="fill-zinc-300 font-medium"
                      formatter={(v) => `${v}%`}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
