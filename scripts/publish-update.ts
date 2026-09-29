import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Version = { major: number; minor: number; patch: number };

type Options = {
  server: string;
  projectId: string;
  apiKey: string;
  environment?: string;
  branch?: string;
  version?: string;
  disabled?: boolean;
  message?: string;
};

function parseArgs(argv: string[]): Options {
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      values[key] = next;
      i++;
    } else {
      values[key] = "true";
    }
  }

  const apiKey = values["api-key"] ?? process.env.API_KEY;
  if (!values.server) throw new Error("Missing required --server");
  if (!values["project-id"]) throw new Error("Missing required --project-id");
  if (!apiKey) throw new Error("Missing required --api-key (or API_KEY env)");

  return {
    server: values.server.replace(/\/+$/, ""),
    projectId: values["project-id"],
    apiKey,
    environment: values.environment,
    branch: values.branch,
    version: values.version,
    disabled: values.disabled === "true",
    message: values.message,
  };
}

function run(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function detectBranch(): string {
  for (const env of ["GITHUB_HEAD_REF", "GITHUB_REF_NAME", "BRANCH_NAME"]) {
    const value = process.env[env];
    if (value) return value;
  }
  return "main";
}

function parseVersion(value: string): Version | null {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function bumpPatch(version: Version): Version {
  return { ...version, patch: version.patch + 1 };
}

async function resolveBaseVersion(): Promise<Version> {
  const pkgPath = join(process.cwd(), "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
      if (typeof pkg.version === "string") {
        const parsed = parseVersion(pkg.version);
        if (parsed) return parsed;
      }
    } catch {}
  }
  return { major: 0, minor: 0, patch: 0 };
}

async function publish(
  options: Options,
  version: Version,
  artifacts: { expoConfig: string; zip: Buffer; commit: string },
): Promise<Response> {
  const form = new FormData();
  form.append("projectId", options.projectId);
  form.append("version", formatVersion(version));
  form.append("commit", artifacts.commit);
  form.append(
    "environment",
    options.environment ?? options.branch ?? detectBranch(),
  );
  form.append("disabled", String(options.disabled ?? false));
  form.append(
    "metadata",
    new Blob(
      [
        JSON.stringify({
          publishedAt: new Date().toISOString(),
          ...(options.message ? { message: options.message } : {}),
        }),
      ],
      { type: "application/json" },
    ),
    "metadata.json",
  );
  form.append(
    "expoConfig",
    new Blob([artifacts.expoConfig], { type: "application/json" }),
    "expoConfig.json",
  );
  form.append(
    "zip",
    new Blob([new Uint8Array(artifacts.zip)], { type: "application/zip" }),
    "dist.zip",
  );

  return fetch(`${options.server}/api/update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}` },
    body: form,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const exportDir = join(tmpdir(), `otasifiy-export-${Date.now()}`);
  const zipPath = `${exportDir}.zip`;

  console.log(`> expo export (${detectBranch()})`);

  try {
    await run(
      "npx",
      [
        "expo",
        "export",
        "--platform",
        "all",
        "--output-dir",
        exportDir,
        "--clear",
      ],
      process.cwd(),
    );

    const metadataPath = join(exportDir, "metadata.json");
    if (!existsSync(metadataPath)) {
      throw new Error(
        "expo export did not produce metadata.json — make sure the project has an export config",
      );
    }
    const distMetadata = JSON.parse(await readFile(metadataPath, "utf8"));
    if (
      !distMetadata?.fileMetadata?.ios ||
      !distMetadata?.fileMetadata?.android
    ) {
      throw new Error(
        "exported metadata.json is missing ios/android fileMetadata",
      );
    }

    console.log("> expo config");
    const expoConfig = await run(
      "npx",
      ["expo", "config", "--json"],
      process.cwd(),
    );
    const parsedConfig = JSON.parse(expoConfig);
    const runtimeVersion =
      parsedConfig?.expo?.runtimeVersion ?? parsedConfig?.runtimeVersion;
    if (!runtimeVersion) {
      throw new Error("runtimeVersion not found in the app config");
    }

    console.log("> zipping artifacts");
    await run("zip", ["-r", "-q", zipPath, "."], exportDir);

    const zip = await readFile(zipPath);
    const commit = await run("git", ["rev-parse", "HEAD"], process.cwd()).catch(
      () => "unknown",
    );

    let version = options.version
      ? (parseVersion(options.version) ?? { major: 0, minor: 0, patch: 0 })
      : await resolveBaseVersion();

    for (let attempt = 0; attempt < 20; attempt++) {
      const response = await publish(options, version, {
        expoConfig,
        zip,
        commit: commit.trim() || "unknown",
      });

      if (response.status === 409) {
        version = bumpPatch(version);
        console.log(`> version taken, retrying with ${formatVersion(version)}`);
        continue;
      }

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Publish failed (${response.status}): ${text}`);
      }

      console.log(
        `> published ${formatVersion(version)} (runtime ${runtimeVersion})`,
      );
      return;
    }

    throw new Error("Could not find an available version after 20 attempts");
  } finally {
    await rm(exportDir, { recursive: true, force: true });
    await rm(zipPath, { force: true });
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
