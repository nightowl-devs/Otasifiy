import { promisify } from "node:util";
import { brotliCompress } from "node:zlib";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const brotliCompressAsync = promisify(brotliCompress);

const BROTLI_MAX_BYTES = 25 * 1024 * 1024;

function accepts(encoding: string | null, token: string): boolean {
  if (!encoding) return false;
  return encoding
    .split(",")
    .some((part) => part.trim().split(";")[0] === token);
}

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

  const headers: Record<string, string> = {
    "Content-Type": asset.contentType || "",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const encoding = req.headers.get("accept-encoding");
  const size = (await assetFile.stat()).size;

  if (accepts(encoding, "gzip")) {    headers["Content-Encoding"] = "gzip";
    const stream = assetFile
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    return new Response(stream, { headers });
  }

  if (accepts(encoding, "deflate")) {
    headers["Content-Encoding"] = "deflate";
    const stream = assetFile
      .stream()
      .pipeThrough(new CompressionStream("deflate"));
    return new Response(stream, { headers });
  }

  if (accepts(encoding, "br")) {
    if (size <= BROTLI_MAX_BYTES) {
      const compressed = await brotliCompressAsync(
        Buffer.from(await assetFile.bytes()),
      );
      headers["Content-Encoding"] = "br";
      headers["Content-Length"] = compressed.length.toString();
      return new Response(compressed, { headers });
    }
  }

  headers["Content-Length"] = size.toString();
  return new Response(assetFile.stream(), { headers });
}
