import { brotliCompressSync } from "node:zlib";
import { deflateSync, gzipSync } from "bun";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const assetId = params.get("assetId");

  if (!assetId) {
    return Response.json(
      { error: "Missing required assetId parameter" },
      { status: 400 },
    );
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    return Response.json({ error: "Asset not found" }, { status: 404 });
  }

  const assetFile = Bun.s3.file(asset.s3Path);
  if (!(await assetFile.exists())) {
    return Response.json({ error: "Asset file not found" }, { status: 404 });
  }

  const encoding = req.headers.get("accept-encoding");
  const acceptsGzip = encoding?.includes("gzip");
  const acceptsBrotli = encoding?.includes("br");
  const acceptsDeflate = encoding?.includes("deflate");

  const headers: Record<string, string> = {
    "Content-Type": asset.contentType || "",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  if (acceptsBrotli) {
    const compressed = brotliCompressSync(await assetFile.bytes());
    headers["Content-Encoding"] = "br";
    headers["Content-Length"] = compressed.length.toString();
    return new Response(compressed, { headers });
  }

  if (acceptsGzip) {
    const compressed = gzipSync(await assetFile.bytes());
    headers["Content-Encoding"] = "gzip";
    headers["Content-Length"] = compressed.length.toString();
    return new Response(compressed, { headers });
  }

  if (acceptsDeflate) {
    const compressed = deflateSync(await assetFile.bytes());
    headers["Content-Encoding"] = "deflate";
    headers["Content-Length"] = compressed.length.toString();
    return new Response(compressed, { headers });
  }

  headers["Content-Length"] = (await assetFile.stat()).size.toString();
  return new Response(assetFile.stream(), { headers });
}
