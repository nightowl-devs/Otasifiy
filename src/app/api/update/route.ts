import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import type { NextRequest } from "next/server";
import { SemVer } from "semver";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  otf: "font/otf",
  ttf: "font/ttf",
  woff: "font/woff",
  woff2: "font/woff2",
  js: "application/javascript",
  hbc: "application/javascript",
  css: "text/css",
  json: "application/json",
  xml: "application/xml",
};

function extToContentType(ext: string): string {
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json({ error: "Missing projectId query param." }, { status: 400 });
  }

  const access = await checkProjectAccess(req, projectId, "MEMBER");
  if (access instanceof Response) return access;

  const environmentId = searchParams.get("environmentId");
  const disabled = searchParams.get("disabled");

  const where: Record<string, unknown> = { projectId };

  if (environmentId) where.environmentId = environmentId;
  if (disabled === "true") where.disabled = true;
  if (disabled === "false") where.disabled = false;

  const updates = await prisma.update.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      environment: true,
      manifests: {
        include: {
          assets: true,
          launchAsset: true,
        },
      },
    },
  });

  return Response.json(updates);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const disabled = formData.get("disabled") === "true";
  const projectId = formData.get("projectId")?.toString();
  const version = formData.get("version")?.toString();
  const commit = formData.get("commit")?.toString() || "unknown";
  const metadataFile = formData.get("metadata") as File | null;
  const expoConfigFile = formData.get("expoConfig") as File | null;
  const zipFile = formData.get("zip") as File | null;

  if (!version) {
    return Response.json({ error: "Missing required version field." }, { status: 400 });
  }

  try {
    new SemVer(version);
  } catch {
    return Response.json({ error: "Invalid version format." }, { status: 400 });
  }

  if (!projectId) {
    return Response.json({ error: "Missing required projectId field." }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }
  const keyProject = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!keyProject || !(await Bun.password.verify(authHeader.slice(7), keyProject.apiKeyHash))) {
    return Response.json({ error: "Invalid API key." }, { status: 403 });
  }

  const environmentName = formData.get("environment")?.toString();
  const branch = formData.get("branch")?.toString();

  if (!environmentName && !branch) {
    return Response.json({ error: "Missing required environment or branch field." }, { status: 400 });
  }

  const envWhere = branch ? { branch, projectId } : { name: environmentName, projectId };

  const envRecord = await prisma.environment.findFirst({
    where: envWhere,
  });

  if (!envRecord) {
    const label = branch ? `branch "${branch}"` : `environment "${environmentName}"`;
    return Response.json({ error: `No environment found for ${label} in this project.` }, { status: 400 });
  }

  const enabledVersions = await prisma.update.findMany({
    where: { environmentId: envRecord.id, disabled: false },
    select: { version: true },
  });

  const maxVersion = enabledVersions.reduce<SemVer | null>((max, u) => {
    const candidate = new SemVer(u.version);
    return max === null || candidate.compare(max) > 0 ? candidate : max;
  }, null);

  if (maxVersion && new SemVer(version).compare(maxVersion) <= 0) {
    return Response.json(
      {
        error: `Version ${version} is not newer than the latest enabled version ${maxVersion.version} in this environment.`,
      },
      { status: 409 },
    );
  }

  if (!expoConfigFile) {
    return Response.json({ error: "Missing required expoConfig file." }, { status: 400 });
  }

  if (!zipFile) {
    return Response.json({ error: "Missing required zip file." }, { status: 400 });
  }

  const expoConfigJson = JSON.parse(await expoConfigFile.text());

  const runtimeVersion = expoConfigJson.expo?.runtimeVersion ?? expoConfigJson.runtimeVersion;

  if (!runtimeVersion) {
    return Response.json({ error: "runtimeVersion not found in expoConfig." }, { status: 400 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: we know its valid
  let metadata: any = {};

  if (metadataFile) {
    try {
      metadata = JSON.parse(await metadataFile.text());
    } catch {
      return Response.json({ error: "Invalid metadata JSON format." }, { status: 400 });
    }
  }

  const zipBuffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);

  const metadataJsonRaw = await zip.file("metadata.json")?.async("text");

  if (!metadataJsonRaw) {
    return Response.json({ error: "metadata.json not found in zip." }, { status: 400 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: parsed from zip metadata.json
  let distMetadata: any;
  try {
    distMetadata = JSON.parse(metadataJsonRaw);
  } catch {
    return Response.json({ error: "Invalid metadata.json in zip." }, { status: 400 });
  }

  const iosMeta = distMetadata.fileMetadata?.ios;
  const androidMeta = distMetadata.fileMetadata?.android;

  if (!iosMeta || !androidMeta) {
    return Response.json({ error: "metadata.json missing ios/android fileMetadata." }, { status: 400 });
  }

  const updateId = randomUUID();
  const iosManifestId = randomUUID();
  const androidManifestId = randomUUID();

  async function uploadToS3(s3Path: string, data: ArrayBuffer) {
    await Bun.s3.file(s3Path).write(new Uint8Array(data));
    return s3Path;
  }

  const uploaded = new Map<string, string>();

  async function uploadAsset(zipPath: string, baseS3Path: string): Promise<{ hash: string; s3Path: string; data: ArrayBuffer }> {
    const file = zip.file(zipPath);
    if (!file) {
      throw new Error(`File not found in zip: ${zipPath}`);
    }
    const data = await file.async("arraybuffer");
    const hash = await sha256(data);

    const cached = uploaded.get(hash);
    if (cached) {
      return { hash, s3Path: cached, data };
    }

    const s3Path = baseS3Path;
    await uploadToS3(s3Path, data);
    uploaded.set(hash, s3Path);
    return { hash, s3Path, data };
  }

  type PendingAsset = {
    id: string;
    hash: string;
    key: string;
    contentType: string;
    fileExtension: string;
    url: string;
    s3Path: string;
  };

  const iosAssets: PendingAsset[] = [];
  const androidAssets: PendingAsset[] = [];

  for (const a of iosMeta.assets ?? []) {
    const { hash, s3Path } = await uploadAsset(a.path, `updates/${updateId}/assets/${a.path.split("/").pop()}`);
    const id = randomUUID();
    iosAssets.push({
      id,
      hash,
      key: hash,
      contentType: extToContentType(a.ext),
      fileExtension: `.${a.ext}`,
      url: `/api/asset?assetId=${id}`,
      s3Path,
    });
  }

  for (const a of androidMeta.assets ?? []) {
    const { hash, s3Path } = await uploadAsset(a.path, `updates/${updateId}/assets/${a.path.split("/").pop()}`);
    const id = randomUUID();
    androidAssets.push({
      id,
      hash,
      key: hash,
      contentType: extToContentType(a.ext),
      fileExtension: `.${a.ext}`,
      url: `/api/asset?assetId=${id}`,
      s3Path,
    });
  }

  const iosBundleZipPath = iosMeta.bundle;
  const androidBundleZipPath = androidMeta.bundle;

  const iosBundleResult = await uploadAsset(iosBundleZipPath, `updates/${updateId}/ios/bundle`);
  const iosBundleId = randomUUID();
  const iosBundleAsset: PendingAsset = {
    id: iosBundleId,
    hash: iosBundleResult.hash,
    key: `bundle-${iosBundleResult.hash}`,
    contentType: "application/javascript",
    fileExtension: ".hbc",
    url: `/api/asset?assetId=${iosBundleId}`,
    s3Path: iosBundleResult.s3Path,
  };

  const androidBundleResult = await uploadAsset(androidBundleZipPath, `updates/${updateId}/android/bundle`);
  const androidBundleId = randomUUID();
  const androidBundleAsset: PendingAsset = {
    id: androidBundleId,
    hash: androidBundleResult.hash,
    key: `bundle-${androidBundleResult.hash}`,
    contentType: "application/javascript",
    fileExtension: ".hbc",
    url: `/api/asset?assetId=${androidBundleId}`,
    s3Path: androidBundleResult.s3Path,
  };

  const update = await prisma.update.create({
    data: {
      id: updateId,
      disabled,
      environment: { connect: { id: envRecord.id } },
      project: { connect: { id: envRecord.projectId! } },
      commit,
      version,
      manifests: {
        create: [
          {
            id: iosManifestId,
            platform: "ios",
            runtimeVersion,
            metadata,
            extra: { expoClient: expoConfigJson },
            launchAsset: {
              create: iosBundleAsset,
            },
            assets: {
              create: iosAssets,
            },
          },
          {
            id: androidManifestId,
            platform: "android",
            runtimeVersion,
            metadata,
            extra: { expoClient: expoConfigJson },
            launchAsset: {
              create: androidBundleAsset,
            },
            assets: {
              create: androidAssets,
            },
          },
        ],
      },
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

  return Response.json(update);
}
