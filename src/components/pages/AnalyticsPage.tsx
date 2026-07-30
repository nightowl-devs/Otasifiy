"use client";

import { TrendingUp } from "lucide-react";
import { useState } from "react";
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
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const monthlyData = [
  { month: "Feb", downloads: 4200 },
  { month: "Mar", downloads: 5800 },
  { month: "Apr", downloads: 4900 },
  { month: "May", downloads: 7200 },
  { month: "Jun", downloads: 8600 },
  { month: "Jul", downloads: 10300 },
];

const monthlyConfig = {
  downloads: { label: "Downloads", color: "#3b82f6" },
} satisfies ChartConfig;

const dailyData = [
  { date: "Mon", downloads: 320 },
  { date: "Tue", downloads: 480 },
  { date: "Wed", downloads: 410 },
  { date: "Thu", downloads: 560 },
  { date: "Fri", downloads: 620 },
  { date: "Sat", downloads: 380 },
  { date: "Sun", downloads: 290 },
];

const dailyConfig = {
  downloads: { label: "Downloads", color: "#a855f7" },
} satisfies ChartConfig;

const platformData = [
  { platform: "iOS", users: 58, fill: "var(--color-ios)" },
  { platform: "Android", users: 42, fill: "var(--color-android)" },
];

const platformConfig = {
  ios: { label: "iOS", color: "#a855f7" },
  android: { label: "Android", color: "#22c55e" },
} satisfies ChartConfig;

const runtimeData = [
  { version: "1.0.0", pct: 42 },
  { version: "1.1.0", pct: 28 },
  { version: "1.2.0", pct: 18 },
  { version: "0.9.0", pct: 8 },
  { version: "0.8.0", pct: 4 },
];

const runtimeConfig = {
  pct: { label: "Users", color: "#f59e0b" },
} satisfies ChartConfig;

type TimeRange = "7d" | "30d" | "90d" | "lifetime";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "lifetime", label: "Lifetime" },
];

interface AnalyticsTimeRangePickerProps {
  currentRange: TimeRange;
  onChange: (range: TimeRange) => void;
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

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  return (
    <div className="mx-auto max-w-6xl p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100 ">Analytics</h1>
        <AnalyticsTimeRangePicker
          currentRange={timeRange}
          onChange={(range) => setTimeRange(range)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1">
            Total Downloads
          </p>
          <p className="text-2xl font-bold text-white">142,389</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs">+12.5% this month</span>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1">
            Downloads This Month
          </p>
          <p className="text-2xl font-bold text-white">10,300</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs">
              +19.8% vs last month
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">
            Monthly Downloads
          </h2>
          <ChartContainer config={monthlyConfig} className="h-64 w-full">
            <BarChart data={monthlyData}>
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
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="#a1a1aa"
              />
              <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
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
            <LineChart data={dailyData}>
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
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="#a1a1aa"
              />
              <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
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
              <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
              <Bar dataKey="pct" fill="var(--color-pct)" radius={[0, 4, 4, 0]}>
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
    </div>
  );
}
