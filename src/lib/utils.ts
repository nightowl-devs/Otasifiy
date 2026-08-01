import { type ClassValue, clsx } from "clsx";
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `otasifiy_${hex}`;
}

export function getRolloutIdentifier(req: NextRequest): string {
  const headers = req.headers;
  return (
    headers.get("expo-device-id") ||
    headers.get("x-deployment-id") ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

export function isInRollout(
  deployPercent: number,
  identifier: string,
): boolean {
  if (deployPercent >= 100) return true;
  if (deployPercent <= 0) return false;
  const hash = createHash("md5").update(identifier).digest("hex");
  const num = Number.parseInt(hash.slice(0, 8), 16);
  return num % 100 < deployPercent;
}
