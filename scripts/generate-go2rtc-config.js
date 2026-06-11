#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const localRegistry = "edge/camera/registry/local.camera-registry.json";
  const defaultRegistry = fs.existsSync(localRegistry) ? localRegistry : "examples/camera-registry.example.json";
  const out = { registry: process.env.CAMERA_REGISTRY_PATH || defaultRegistry, output: "go2rtc.generated.yaml", dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--registry") out.registry = argv[++i];
    else if (arg === "--output") out.output = argv[++i];
  }
  return out;
}

function credentialEnvName(ref) {
  return String(ref || "").replace(/^local:/, "").replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
}

const SUPPORTED_PROVIDERS = new Set(["generic_rtsp", "onvif", "hikvision", "dahua", "uniview", "tuya_camera", "other"]);
const SUPPORTED_PROTOCOLS = new Set(["rtsp", "onvif", "hls", "mjpeg", "http_snapshot"]);

function normalizeProvider(value) {
  const provider = String(value || "generic_rtsp").trim();
  return SUPPORTED_PROVIDERS.has(provider) ? provider : "other";
}

function normalizeProtocol(value) {
  const protocol = String(value || "rtsp").trim();
  if (!SUPPORTED_PROTOCOLS.has(protocol)) throw new Error(`unsupported protocol: ${protocol}`);
  return protocol;
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

  const host = camera.host || camera.ip || camera.dvr_ip;
  const channel = String(camera.channel || camera.channel_number || "1");
  const template = camera.rtsp_path_template || templateForProvider(camera.provider);
  const rtspPath = template.replace(/\{channel\}/g, channel);
  const ref = camera.credential_ref;
  if (!host) throw new Error(`${camera.camera_id || camera.name}: missing host/ip`);
  if (!ref) throw new Error(`${camera.camera_id || camera.name}: missing credential_ref`);
  const key = credentialEnvName(ref);
  const user = process.env[`EDGE_CREDENTIAL_${key}_USER`];
  const pass = process.env[`EDGE_CREDENTIAL_${key}_PASS`];
  if (!dryRun && (!user || !pass)) throw new Error(`${camera.camera_id || camera.name}: missing EDGE_CREDENTIAL_${key}_USER/PASS`);
  const userPart = dryRun ? "${USER}:${PASS}@" : `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`;
  return `rtsp://${userPart}${host}:554${rtspPath}`;
}

function templateForProvider(provider) {
  const normalized = normalizeProvider(provider);
  if (normalized === "dahua") return "/cam/realmonitor?channel={channel}&subtype=0";
  if (normalized === "uniview") return "/media/video{channel}";
  return "/Streaming/Channels/{channel}01";
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function main() {
  const args = parseArgs(process.argv);
  const registryPath = path.resolve(args.registry);
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const cameras = Array.isArray(registry.cameras) ? registry.cameras : [];
  if (!cameras.length) throw new Error("camera registry has no cameras[]");

  const lines = ["api:", "  listen: \"0.0.0.0:1984\"", "streams:"];
  const results = [];
  for (const camera of cameras) {
    if (camera.enabled === false) continue;
    const id = String(camera.camera_id || camera.name || camera.host || "camera").replace(/[^a-zA-Z0-9_-]+/g, "_");
    const provider = normalizeProvider(camera.provider);
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
  console.log(JSON.stringify({ ok: true, output: path.resolve(args.output), streams: results }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
}
