#!/usr/bin/env node
require("dotenv").config();
const { spawnSync } = require("child_process");
const {
  DEFAULT_GENERATED_CONFIG,
  cleanBaseUrl,
  credentialSummary,
  defaultAgentId,
  executable,
  loadRegistry,
  redactUrl,
  registryUrlFromEnv,
} = require("./edge-camera-common");

function parseArgs(argv) {
  const out = { generate: false, start: false, strict: false, registryUrl: "", backendUrl: "", estateId: "", agentId: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--generate") out.generate = true;
    else if (arg === "--start") out.start = true;
    else if (arg === "--strict") out.strict = true;
    else if (arg === "--registry-url") out.registryUrl = argv[++i];
    else if (arg === "--backend-url") out.backendUrl = argv[++i];
    else if (arg === "--estate-id") out.estateId = argv[++i];
    else if (arg === "--agent-id") out.agentId = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const backendUrl = cleanBaseUrl(args.backendUrl || process.env.CLOUD_URL || process.env.BACKEND_URL || process.env.OYI_BACKEND_URL);
  const estateId = String(args.estateId || process.env.SITE_ID || process.env.ESTATE_ID || process.env.OYI_ESTATE_ID || "").trim();
  const agentId = String(args.agentId || process.env.AGENT_ID || process.env.EDGE_AGENT_ID || defaultAgentId()).trim();
  const tokenPresent = Boolean(process.env.CAMERA_REGISTRY_TOKEN || process.env.OYI_EDGE_AGENT_TOKEN || process.env.EDGE_AGENT_TOKEN || process.env.BACKEND_TOKEN);
  const registryUrl = args.registryUrl || process.env.CAMERA_REGISTRY_URL || (backendUrl && estateId ? `${backendUrl}/cameras/edge-registry/estate/${encodeURIComponent(estateId)}` : registryUrlFromEnv());

  const summary = {
    ok: true,
    backend_url: backendUrl || null,
    estate_id_present: Boolean(estateId),
    agent_id: agentId,
    registry_url: registryUrl ? redactUrl(registryUrl) : null,
    token_present: tokenPresent,
    generated_config: DEFAULT_GENERATED_CONFIG,
    next_commands: [],
    warnings: [],
  };

  if (!backendUrl) summary.warnings.push("Set CLOUD_URL or BACKEND_URL to the Ochiga backend URL.");
  if (!estateId) summary.warnings.push("Set SITE_ID or ESTATE_ID to the estate being deployed.");
  if (!tokenPresent) summary.warnings.push("Set CAMERA_REGISTRY_TOKEN or OYI_EDGE_AGENT_TOKEN before pulling the backend registry.");

  try {
    const loaded = await loadRegistry({ registryUrl, fallbackLocalOnRemoteError: !args.strict });
    const cameras = loaded.registry.cameras || [];
    summary.registry_source = loaded.source;
    if (loaded.remote_error) summary.warnings.push(`Backend registry was not available: ${loaded.remote_error}. Using local/example registry for setup guidance.`);
    summary.cameras_loaded = cameras.length;
    summary.credentials = credentialSummary(cameras);
    summary.streams_ready_for_config = cameras.filter((camera) => camera.enabled !== false).length;
  } catch (err) {
    summary.ok = false;
    summary.registry_error = err.message;
  }

  const go2rtcBin = process.env.GO2RTC_BIN || "/Users/ochigaidoko/go2rtc/go2rtc";
  summary.go2rtc_binary_present = executable(go2rtcBin);
  if (!summary.go2rtc_binary_present) summary.warnings.push(`Install go2rtc or set GO2RTC_BIN. Checked: ${go2rtcBin}`);

  if (args.generate && summary.ok) {
    const generated = spawnSync(process.execPath, ["scripts/generate-go2rtc-config.js"], { encoding: "utf8" });
    summary.config_generation = generated.status === 0 ? "generated" : "failed";
    if (generated.status !== 0) {
      summary.ok = false;
      summary.config_error = (generated.stderr || generated.stdout).slice(0, 800);
    }
  }

  summary.next_commands.push("npm run edge:health");
  summary.next_commands.push("npm run edge:go2rtc:dry-run");
  summary.next_commands.push("npm run edge:go2rtc:config");
  summary.next_commands.push(`${go2rtcBin} -config ${DEFAULT_GENERATED_CONFIG}`);
  summary.next_commands.push("npm run edge:camera");

  if (args.start) {
    summary.warnings.push("Automatic go2rtc supervision is not enabled by default; start go2rtc with the printed command or your process manager.");
  }

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok && args.strict) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
