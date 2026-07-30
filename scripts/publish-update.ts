#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    environment: { type: "string", short: "e", default: "production" },
    branch: { type: "string", short: "b" },
    server: { type: "string", short: "s", default: "http://localhost:3000" },
    version: { type: "string", short: "v" },
    "runtime-version": { type: "string", short: "r" },
    "app-config": { type: "string", short: "c" },
    "project-dir": { type: "string", short: "p", default: "." },
    disabled: { type: "boolean", default: false },
    message: { type: "string", short: "m" },
    "api-key": { type: "string" },
    commit: { type: "string" },
    "project-id": { type: "string" },
  },
  allowPositionals: false,
});

const {
  environment,
  branch: branchArg,
  server,
  version: versionOverride,
  "runtime-version": runtimeVersionOverride,
  "app-config": appConfigPath,
  "project-dir": projectDir,
  disabled,
  message,
  "api-key": apiKey,
  "project-id": projectId,
} = args.values;

if (!projectId) {
  console.error("Error: --project-id is required");
  process.exit(1);
}

const projectRoot = resolve(projectDir);

const APP_CONFIG_PATHS = [
  appConfigPath && resolve(projectRoot, appConfigPath),
  join(projectRoot, "app.json"),
  join(projectRoot, "app.config.json"),
].filter(Boolean) as string[];

let expoConfig: Record<string, unknown> = {};
let configPath = "";

for (const p of APP_CONFIG_PATHS) {
  if (existsSync(p)) {
    configPath = p;
    expoConfig = JSON.parse(readFileSync(p, "utf-8"));
    break;
  }
}

if (!configPath) {
  console.error("Could not find app.json or app.config.json. Provide one via --app-config.");
  process.exit(1);
}

const runtimeVersion =
  runtimeVersionOverride ??
  expoConfig?.expo?.runtimeVersion ??
  expoConfig?.runtimeVersion ??
  expoConfig?.extra?.expoClient?.runtimeVersion;

const version = versionOverride ?? expoConfig?.expo?.version ?? expoConfig?.version;

if (!runtimeVersion) {
  console.error("runtimeVersion not found in app config. Provide via --runtime-version.");
  process.exit(1);
}

if (!version) {
  console.error("version not found in app config. Provide via --version.");
  process.exit(1);
}

console.log(`\x1b[36m► Exporting Expo project...\x1b[0m`);
await $`bunx expo export --platform all`.cwd(projectRoot);

const distDir = join(projectRoot, "dist");

if (!existsSync(distDir)) {
  console.error("Export failed: dist/ directory not found.");
  process.exit(1);
}

console.log(`\x1b[36m► Zipping dist/...\x1b[0m`);
const zipPath = join(projectRoot, ".expo-dist.zip");
await $`zip -r ${zipPath} .`.cwd(distDir);

console.log(`\x1b[36m► Uploading update to ${server}/api/update...\x1b[0m`);

const commit = args.values.commit || (await $`git rev-parse HEAD`.text().catch(() => "unknown")).trim();

const branch = branchArg || (await $`git rev-parse --abbrev-ref HEAD`.text().catch(() => "")).trim();

const formData = new FormData();
formData.append("zip", Bun.file(zipPath));
formData.append("expoConfig", new Blob([JSON.stringify(expoConfig)], { type: "application/json" }), "expoConfig.json");
formData.append("version", version);
formData.append("commit", commit);
formData.append("disabled", String(disabled));
formData.append("projectId", projectId);

if (branch) {
  formData.append("branch", branch);
} else {
  formData.append("environment", environment);
}

if (message) {
  const metadata = JSON.stringify({ message });
  formData.append("metadata", new Blob([metadata], { type: "application/json" }), "metadata.json");
}

const headers: Record<string, string> = {
  Authorization: `Bearer ${apiKey}`,
};

const response = await fetch(`${server}/api/update`, {
  method: "POST",
  headers,
  body: formData,
});

const result = await response.json();

if (!response.ok) {
  console.error(`\x1b[31mUpload failed (${response.status}): ${result.error}\x1b[0m`);
  process.exit(1);
}

console.log(`\x1b[32m✓ Update published!\x1b[0m`);
console.log(`  Version: ${version}`);
console.log(`  Branch: ${branch || environment}`);
console.log(`  Environment: ${result.environment?.name || environment}`);
console.log(`  Runtime: ${runtimeVersion}`);
console.log(`  ID: ${result.id}`);

await $`rm -f ${zipPath}`;

if (!apiKey && !Bun.env.API_KEY) {
  console.log(`\n\x1b[33mTip: Set the API_KEY env var or pass --api-key to authenticate.\x1b[0m`);
}
