#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

function parseArgs(argv) {
  const localRegistry = "edge/camera/registry/local.camera-registry.json";
  const defaultRegistry = fs.existsSync(localRegistry) ? localRegistry : "examples/camera-registry.example.json";
  const out = {
    registry: process.env.CAMERA_REGISTRY_PATH || defaultRegistry,
    registryUrl: process.env.CAMERA_REGISTRY_URL || "",
    output: "go2rtc.generated.yaml",
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

function credentialEnvName(ref) {
  return String(ref || "").replace(/^local:/, "").replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
}

const SUPPORTED_PROVIDERS = new Set(["generic_rtsp", "onvif", "hikvision", "dahua", "hilook", "uniview", "tuya_camera", "other"]);
const SUPPORTED_PROTOCOLS = new Set(["rtsp", "onvif", "hls", "mjpeg", "http_snapshot"]);

function normalizeProvider(value) {
  const provider = String(value || "generic_rtsp").trim().toLowerCase();
  if (provider === "hilook") return "hikvision";
  return SUPPORTED_PROVIDERS.has(provider) ? provider : "other";
}

function normalizeProtocol(value) {
  const protocol = String(value || "rtsp").trim().toLowerCase();
  if (!SUPPORTED_PROTOCOLS.has(protocol)) throw new Error(`unsupported protocol: ${protocol}`);
  return protocol;
}

function templateForProvider(provider) {
  const normalized = normalizeProvider(provider);
  if (normalized === "dahua") return "/cam/realmonitor?channel={channel}&subtype=0";
  if (normalized === "uniview") return "/media/video{channel}";
  return "/Streaming/Channels/{channel}01";
}

function buildStreamUrl(camera, dryRun) {
  const protocol = normalizeProtocol(camera.protocol || camera.stream_protocol || "rtsp");
  if (protocol === "hls") {
    if (!camera.hls_url) throw new Error(`${camera.camera_id || camera.name}: missing hls_url`);
    return camera.hls_url;
  }
  if (protocol === "mjpeg") {
    if (!camera.mjpeg_url) throw new Error(`${camera.camera_id || camera.name}: missing mjpeg_url`);
    return camera.mjpeg_url;
  }
  if (protocol === "http_snapshot") {
    if (!camera.snapshot_url) throw new Error(`${camera.camera_id || camera.name}: missing snapshot_url`);
    return camera.snapshot_url;
  }

  const host = camera.host || camera.ip || camera.dvr_ip || camera.ip_address;
  const channel = String(camera.channel || camera.channel_number || "1");
  const template = camera.rtsp_path_template || templateForProvider(camera.provider || camera.brand);
  const rtspPath = template.replace(/\{channel\}/g, channel);
  const ref = camera.credential_ref;
  if (!host) throw new Error(`${camera.camera_id || camera.name}: missing host/ip`);
  if (!ref) throw new Error(`${camera.camera_id || camera.name}: missing credential_ref`);
  const key = credentialEnvName(ref);
  const user = process.env[`EDGE_CREDENTIAL_${key}_USER`];
  const pass = process.env[`EDGE_CREDENTIAL_${key}_PASS`];
  if (!dryRun && (!user || !pass)) throw new Error(`${camera.camera_id || camera.name}: missing EDGE_CREDENTIAL_${key}_USER/PASS`);
  const userPart = dryRun ? "${USER}:${PASS}@" : `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`;
  const port = Number(camera.rtsp_port || camera.port || 554);
  return `rtsp://${userPart}${host}:${port}${rtspPath}`;
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if ((res.statusCode || 0) >= 400) return reject(new Error(`registry url returned ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error("registry url timed out")));
  });
}

async function loadRegistry(args) {
  if (args.registryUrl) {
    const data = await fetchJson(args.registryUrl, process.env.CAMERA_REGISTRY_TOKEN || process.env.EDGE_BACKEND_TOKEN || "");
    return { registryPath: args.registryUrl, registry: data };
  }
  const registryPath = path.resolve(args.registry);
  return { registryPath, registry: JSON.parse(fs.readFileSync(registryPath, "utf8")) };
}

async function main() {
  const args = parseArgs(process.argv);
  const { registryPath, registry } = await loadRegistry(args);
  const cameras = Array.isArray(registry.cameras) ? registry.cameras : [];
  if (!cameras.length) throw new Error("camera registry has no cameras[]");

  const lines = ["api:", "  listen: \"0.0.0.0:1984\"", "streams:"];
  const results = [];
  for (const camera of cameras) {
    if (camera.enabled === false) continue;
    const id = String(camera.camera_id || camera.id || camera.name || camera.host || "camera").replace(/[^a-zA-Z0-9_-]+/g, "_");
    const provider = normalizeProvider(camera.provider || camera.brand);
    const protocol = normalizeProtocol(camera.protocol || camera.stream_protocol || "rtsp");
    const url = buildStreamUrl(camera, args.dryRun);
    lines.push(`  ${id}: ${yamlString(url)}`);
    results.push({ camera_id: id, provider, protocol, credential_ref: camera.credential_ref, status: "configurable" });
  }

  const output = `${lines.join("\n")}\n`;
  if (args.dryRun) {
    console.log(JSON.stringify({ ok: true, dry_run: true, registry: registryPath, streams: results }, null, 2));
    console.log(output);
    return;
  }
  fs.writeFileSync(path.resolve(args.output), output);
  console.log(JSON.stringify({ ok: true, output: path.resolve(args.output), registry: registryPath, streams: results }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
