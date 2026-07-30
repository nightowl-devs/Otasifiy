import { createHash } from "node:crypto";
import FormData from "form-data";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getRolloutIdentifier(req: NextRequest): string {
  const headers = req.headers;
  return (
    headers.get("expo-device-id") ||
    headers.get("x-deployment-id") ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

function isInRollout(deployPercent: number, identifier: string): boolean {
  if (deployPercent >= 100) return true;
  if (deployPercent <= 0) return false;
  const hash = createHash("md5").update(identifier).digest("hex");
  const num = Number.parseInt(hash.slice(0, 8), 16);
  return num % 100 < deployPercent;
}

export async function GET(req: NextRequest) {
  const headers = req.headers;

  const platform = headers.get("expo-platform");
  const runtimeVersion = headers.get("expo-runtime-version");
  const sdkVersion = headers.get("expo-sdk-version");
  const acceptHeader = headers.get("accept");

  if (!platform || !runtimeVersion || !sdkVersion) {
    return NextResponse.json(
      {
        error: "Missing required headers",
      },
      {
        status: 400,
      },
    );
  }

  if (platform !== "ios" && platform !== "android") {
    return NextResponse.json(
      {
        error: "Invalid platform",
      },
      {
        status: 400,
      },
    );
  }

  if (!acceptHeader) {
    return NextResponse.json(
      {
        error: "Missing required accept header",
      },
      {
        status: 406,
      },
    );
  }

  const { searchParams } = req.nextUrl;
  const projectSlug = searchParams.get("slug") || searchParams.get("project");
  const projectIdParam = searchParams.get("projectId");

  const where: Record<string, unknown> = {
    disabled: false,
    manifests: {
      some: {
        platform: platform,
        runtimeVersion: runtimeVersion,
      },
    },
    createdAt: {
      lte: new Date(),
    },
  };

  if (projectSlug) {
    where.project = { slug: projectSlug };
  } else if (projectIdParam) {
    where.projectId = projectIdParam;
  }

  const update = await prisma.update.findFirst({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      manifests: {
        include: {
          launchAsset: true,
          assets: true,
        },
      },
    },
  });

  if (!update) {
    const formData = new FormData();

    formData.append(
      "directive",
      JSON.stringify({
        type: "noUpdateAvailable",
      }),
      {
        contentType: "application/json",
      },
    );

    const buffer = formData.getBuffer();

    const response = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": formData
          .getHeaders()
          ["content-type"].replace("multipart/form-data", "multipart/mixed"),

        "expo-protocol-version": "1",
        "expo-sfv-version": "0",
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });

    return response;
  }

  const identifier = getRolloutIdentifier(req);

  if (!isInRollout(update.deployPercent, identifier)) {
    const formData = new FormData();

    formData.append(
      "directive",
      JSON.stringify({
        type: "noUpdateAvailable",
      }),
      {
        contentType: "application/json",
      },
    );

    const buffer = formData.getBuffer();

    const response = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": formData
          .getHeaders()
          ["content-type"].replace("multipart/form-data", "multipart/mixed"),

        "expo-protocol-version": "1",
        "expo-sfv-version": "0",
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });

    return response;
  }

  const dbManifest = update.manifests.find(
    (m) => m.platform === platform && m.runtimeVersion === runtimeVersion,
  );

  if (!dbManifest) {
    return NextResponse.json(
      { error: "No matching manifest found" },
      { status: 404 },
    );
  }

  const toAsset = (a: NonNullable<typeof dbManifest.launchAsset>) => ({
    hash: a.hash,
    key: a.key,
    contentType: a.contentType ?? "",
    fileExtension: a.fileExtension ?? undefined,
    url: a.url,
  });

  const manifest = {
    id: dbManifest.id,
    createdAt: dbManifest.createdAt.toISOString(),
    runtimeVersion: dbManifest.runtimeVersion,
    launchAsset: dbManifest.launchAsset
      ? toAsset(dbManifest.launchAsset)
      : undefined,
    assets: dbManifest.assets.map(toAsset),
    metadata: dbManifest.metadata as Record<string, string>,
    extra: dbManifest.extra as Record<string, unknown>,
  };

  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest), {
    contentType: "application/json; charset=utf-8",
  });

  const buffer = form.getBuffer();

  const response = new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": form
        .getHeaders()
        ["content-type"].replace("multipart/form-data", "multipart/mixed"),
      "expo-protocol-version": "1",
      "expo-sfv-version": "0",
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });

  return response;
}
