import type { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  return Response.json({ status: "ok" }, { status: 200 });
}
