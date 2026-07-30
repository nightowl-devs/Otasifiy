"use client";

import {
  BarChartIcon,
  ContainerIcon,
  HardDriveUploadIcon,
  HomeIcon,
  Settings,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "@/context/project-context";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: HomeIcon,
    alwaysEnabled: true,
  },
  { href: "/dashboard/updates", label: "Updates", icon: HardDriveUploadIcon },
  {
    href: "/dashboard/environments",
    label: "Environments",
    icon: ContainerIcon,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChartIcon,
  },
  {
    href: "/dashboard/team",
    label: "Team",
    icon: UsersRoundIcon,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { projects, loading } = useProject();
  const hasProjects = !loading && projects.length > 0;

  return (
    <aside className="flex  w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon, alwaysEnabled }) => {
          const active = pathname === href;
          const disabled = !alwaysEnabled && !hasProjects;

          return (
            <Link
              key={href}
              href={disabled ? "/dashboard" : href}
              onClick={disabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : disabled
                    ? "text-zinc-600 cursor-not-allowed"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
