#!/usr/bin/env node
require("dotenv").config();
const { spawnSync } = require("child_process");
const {
  DEFAULT_GENERATED_CONFIG,
  DEFAULT_GO2RTC_API_URL,
  checkHttpJson,
  credentialSummary,
  executable,
  exists,
  loadRegistry,
  redactUrl,
  registryUrlFromEnv,
  repoPath,
} = require("./edge-camera-common");

function parseArgs(argv) {
  const out = { strict: false, registry: process.env.CAMERA_REGISTRY_PATH || "", registryUrl: process.env.CAMERA_REGISTRY_URL || "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--strict") out.strict = true;
    else if (arg === "--registry") out.registry = argv[++i];
    else if (arg === "--registry-url") out.registryUrl = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const go2rtcBin = process.env.GO2RTC_BIN || "/Users/ochigaidoko/go2rtc/go2rtc";
  const go2rtcConfig = process.env.GO2RTC_CONFIG_PATH || DEFAULT_GENERATED_CONFIG;
  const go2rtcApi = process.env.GO2RTC_API_URL || DEFAULT_GO2RTC_API_URL;
  const backendUrl = String(process.env.CLOUD_URL || process.env.BACKEND_URL || process.env.OYI_BACKEND_URL || "").replace(/\/$/, "");
  const edgeTokenPresent = Boolean(process.env.OYI_EDGE_AGENT_TOKEN || process.env.EDGE_AGENT_TOKEN || process.env.CAMERA_REGISTRY_TOKEN || process.env.BACKEND_TOKEN);
  const edgeRegistered = Boolean(process.env.AGENT_ID || process.env.EDGE_AGENT_ID) && Boolean(process.env.SITE_ID || process.env.ESTATE_ID);

  let registryResult = null;
  let registryError = null;
  try {
    registryResult = await loadRegistry({ ...args, fallbackLocalOnRemoteError: true });
  } catch (err) {
    registryError = err.message;
  }

  const cameras = registryResult?.registry?.cameras || [];
  const credentials = credentialSummary(cameras);
  const dryRun = spawnSync(process.execPath, ["scripts/generate-go2rtc-config.js", "--dry-run", ...(args.registry ? ["--registry", args.registry] : []), ...(args.registryUrl ? ["--registry-url", args.registryUrl] : [])], {
    cwd: repoPath("."),
    encoding: "utf8",
  });
  const backendHealth = backendUrl ? await checkHttpJson(`${backendUrl}/health`, 2500) : { ok: false, reason: "CLOUD_URL/BACKEND_URL not set" };
  const go2rtcHealth = await checkHttpJson(`${String(go2rtcApi).replace(/\/$/, "")}/api/streams`, 2500);
  const streamCount = go2rtcHealth.ok && go2rtcHealth.body && typeof go2rtcHealth.body === "object" ? Object.keys(go2rtcHealth.body).length : 0;

  const checks = [
    { check: "edge registered", ok: edgeRegistered, agent_id_present: Boolean(process.env.AGENT_ID || process.env.EDGE_AGENT_ID), estate_id_present: Boolean(process.env.SITE_ID || process.env.ESTATE_ID) },
    { check: "backend reachable", ok: Boolean(backendHealth.ok), backend_url: backendUrl || null, detail: backendHealth.ok ? "reachable" : backendHealth.reason || backendHealth.error || backendHealth.status || "not reachable" },
    { check: "registry loaded", ok: Boolean(registryResult), source: registryResult?.source || null, registry: registryResult ? redactUrl(registryResult.registryPath) : registryUrlFromEnv() || args.registry || null, remote_registry: registryResult?.remote_registry ? redactUrl(registryResult.remote_registry) : undefined, remote_error: registryResult?.remote_error, error: registryError },
    { check: "cameras loaded", ok: cameras.length > 0, count: cameras.length },
    { check: "credentials configured", ok: credentials.every((item) => item.ready), refs: credentials },
    { check: "go2rtc binary present", ok: executable(go2rtcBin), path: go2rtcBin },
    { check: "go2rtc config present", ok: exists(repoPath(go2rtcConfig)) || exists(go2rtcConfig), path: go2rtcConfig },
    { check: "go2rtc reachable", ok: Boolean(go2rtcHealth.ok), api_url: go2rtcApi, configured_streams: streamCount, detail: go2rtcHealth.ok ? "reachable" : go2rtcHealth.error || go2rtcHealth.status || "not reachable" },
    { check: "go2rtc config dry-run", ok: dryRun.status === 0, detail: dryRun.status === 0 ? "configurable" : (dryRun.stderr || dryRun.stdout).slice(0, 800) },
  ];

  const requiredForDryRun = ["registry loaded", "cameras loaded", "go2rtc config dry-run"];
  const ok = checks.filter((item) => args.strict || requiredForDryRun.includes(item.check)).every((item) => item.ok);
  console.log(JSON.stringify({
    ok,
    strict: args.strict,
    edge_registered: edgeRegistered,
    backend_reachable: Boolean(backendHealth.ok),
    go2rtc_reachable: Boolean(go2rtcHealth.ok),
    cameras_loaded: cameras.length,
    streams_configured: dryRun.status === 0 ? cameras.filter((camera) => camera.enabled !== false).length : 0,
    credentials_ready: credentials.every((item) => item.ready),
    checks,
  }, null, 2));
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
