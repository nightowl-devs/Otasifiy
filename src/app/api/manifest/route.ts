import { sha } from "bun";
import FormData from "form-data";
import { type NextRequest, NextResponse } from "next/server";
import { SemVer } from "semver";
import { prisma } from "@/lib/prisma";
import { getRolloutIdentifier, isInRollout } from "@/lib/utils";

function noUpdateResponse(): NextResponse {
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

  return new NextResponse(new Uint8Array(buffer), {
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
}

export async function GET(req: NextRequest) {
  const headers = req.headers;

  const platform = headers.get("expo-platform");
  const runtimeVersion = headers.get("expo-runtime-version");
  const sdkVersion = headers.get("expo-sdk-version");
  const currentUpdateId = headers.get("expo-current-update-id");
  const embeddedUpdateId = headers.get("expo-embedded-update-id");
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

  const updates = await prisma.update.findMany({
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

  if (updates.length === 0) {
    return noUpdateResponse();
  }

  const clientUpdateId = currentUpdateId ?? embeddedUpdateId;

  if (clientUpdateId) {
    const clientManifest = await prisma.manifest.findUnique({
      where: { id: clientUpdateId },
      select: {
        update: { select: { version: true, projectId: true } },
      },
    });

    if (
      clientManifest &&
      clientManifest.update.projectId === updates[0].projectId
    ) {
      const maxVersion = updates.reduce<SemVer>((max, u) => {
        const candidate = new SemVer(u.version);
        return candidate.compare(max) > 0 ? candidate : max;
      }, new SemVer(updates[0].version));

      const clientVersion = new SemVer(clientManifest.update.version);

      if (clientVersion.compare(maxVersion) >= 0) {
        return noUpdateResponse();
      }
    }
  }

  const identifier = getRolloutIdentifier(req);

  const update = updates.find((u) => isInRollout(u.deployPercent, identifier));

  if (!update) {
    return noUpdateResponse();
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

  await prisma.download.create({
    data: {
      projectId: update.projectId,
      updateId: update.id,
      environmentId: update.environmentId,
      platform,
      runtimeVersion,
      sdkVersion: sdkVersion,
      deviceIdHash: sha(getRolloutIdentifier(req)).toString(),
    },
  });
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
