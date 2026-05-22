#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");
const { spawnSync } = require("child_process");

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function redacted(value) {
  return value ? "present" : "missing";
}

async function main() {
  const dryRun = flag("dry-run");
  const baseUrl = arg("cloud-url", process.env.CLOUD_URL || "");
  const token = process.env.OYI_EDGE_AGENT_TOKEN || process.env.EDGE_AGENT_TOKEN || "";
  const siteId = arg("site-id", process.env.SITE_ID || "00000000-0000-0000-0000-000000000000");
  const agentId = arg("agent-id", process.env.AGENT_ID || "edge-lab-01");
  const cameraIp = arg("camera-ip", process.env.CAMERA_IP || "192.168.1.64");
  const cameraId = arg("camera-id", "generic-rtsp-gate-01");
  const provider = arg("provider", process.env.CAMERA_PROVIDER || "generic_rtsp");
  const protocol = arg("protocol", process.env.CAMERA_PROTOCOL || "rtsp");
  const credentialRef = arg("credential-ref", process.env.CAMERA_CREDENTIAL_REF || "local:generic-rtsp-main");

  const checks = [];
  checks.push({ check: "edge token configured", ok: dryRun || Boolean(token), value: redacted(token), skipped: dryRun && !token ? "dry-run" : undefined });
  checks.push({ check: "backend cloud url configured", ok: Boolean(baseUrl) || dryRun, value: baseUrl || "dry-run" });

  const gen = spawnSync(process.execPath, ["scripts/generate-go2rtc-config.js", "--dry-run"], { encoding: "utf8" });
  checks.push({ check: "go2rtc config dry-run", ok: gen.status === 0, detail: gen.status === 0 ? "generated" : gen.stderr || gen.stdout });

  if (!dryRun) {
    if (!baseUrl) throw new Error("CLOUD_URL is required without --dry-run");
    if (!token) throw new Error("OYI_EDGE_AGENT_TOKEN or EDGE_AGENT_TOKEN is required without --dry-run");
    const client = axios.create({ baseURL: baseUrl.replace(/\/$/, ""), timeout: 10000, headers: { "x-edge-token": token, Authorization: `Bearer ${token}`, "x-edge-agent-id": agentId } });
    const register = await client.post("/edge/agent/register", { site_id: siteId, agent_id: agentId, status: "online", capabilities: ["phase1_bench"], runtime_version: "bench" });
    checks.push({ check: "backend register", ok: register.status < 300, status: register.status });
    const heartbeat = await client.post("/edge/agent/heartbeat", { site_id: siteId, agent_id: agentId, status: "online", queue_depth: 0, camera_count: 1, device_count: 1, sync_status: "bench", runtime_version: "bench" });
    checks.push({ check: "heartbeat persists", ok: heartbeat.status < 300, status: heartbeat.status, persistence: heartbeat.data?.persistence });
    const discovery = await client.post("/edge/discovery/push", { site_id: siteId, agent_id: agentId, devices: [{ camera_id: cameraId, ip: cameraIp, provider, protocol, source: "bench", credential_ref: credentialRef, stream_protocol: protocol, status: "pending" }] });
    checks.push({ check: "camera placeholder discovery", ok: discovery.status < 300, status: discovery.status, persisted: discovery.data?.persisted });
    const health = await client.post(`/edge/cameras/${encodeURIComponent(cameraId)}/stream-health`, { site_id: siteId, agent_id: agentId, status: "pending", health_status: "pending_stream_details", provider_error: "dry stream credentials not supplied" });
    checks.push({ check: "stream health telemetry", ok: health.status < 300, status: health.status, persistence: health.data?.persistence });
  } else {
    checks.push({ check: "backend register", ok: true, skipped: "dry-run" });
    checks.push({ check: "heartbeat persists", ok: true, skipped: "dry-run" });
    checks.push({ check: "camera placeholder exists", ok: true, skipped: "dry-run", provider, protocol });
    checks.push({ check: "stream health status can be marked", ok: true, skipped: "dry-run" });
  }

  const ok = checks.every((item) => item.ok);
  console.log(JSON.stringify({ ok, dry_run: dryRun, site_id: siteId, agent_id: agentId, provider, protocol, checks }, null, 2));
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
