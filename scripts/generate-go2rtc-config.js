#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  DEFAULT_GENERATED_CONFIG,
  buildGo2rtcConfig,
  credentialSummary,
  loadRegistry,
  redactUrl,
  repoPath,
} = require("./edge-camera-common");

function parseArgs(argv) {
  const out = {
    registry: process.env.CAMERA_REGISTRY_PATH || "",
    registryUrl: process.env.CAMERA_REGISTRY_URL || "",
    output: process.env.GO2RTC_CONFIG_PATH || DEFAULT_GENERATED_CONFIG,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--registry") out.registry = argv[++i];
    else if (arg === "--registry-url") out.registryUrl = argv[++i];
    else if (arg === "--output") out.output = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const { registryPath, registry, source, token_present, remote_registry, remote_error } = await loadRegistry({
    ...args,
    fallbackLocalOnRemoteError: args.dryRun,
  });
  const cameras = Array.isArray(registry.cameras) ? registry.cameras : [];
  if (!cameras.length) throw new Error("camera registry has no cameras[]");

  const result = buildGo2rtcConfig(registry, { dryRun: args.dryRun });
  const credentials = credentialSummary(cameras);
  const summary = {
    ok: true,
    dry_run: args.dryRun,
    registry_source: source,
    registry: redactUrl(registryPath),
    remote_registry: remote_registry ? redactUrl(remote_registry) : undefined,
    remote_error,
    remote_token_present: token_present,
    cameras_loaded: cameras.length,
    streams_configured: result.streams.length,
    credential_refs: credentials,
    streams: result.streams,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    console.log(result.yaml.replace(/:\/\/[^\n@]+:[^\n@]+@/g, "://***:***@"));
    return;
  }

  const outputPath = path.isAbsolute(args.output) ? args.output : repoPath(args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.yaml, { mode: 0o600 });
  fs.chmodSync(outputPath, 0o600);
  console.log(JSON.stringify({ ...summary, output: outputPath }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
