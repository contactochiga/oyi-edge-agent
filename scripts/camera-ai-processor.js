#!/usr/bin/env node
require("dotenv").config();
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const {
  DEFAULT_GO2RTC_API_URL,
  cleanBaseUrl,
  defaultAgentId,
  loadRegistry,
  redactUrl,
  streamId,
} = require("./edge-camera-common");
const { normalizeEvent } = require("../src/intelligence-core");

const ALLOWED_EVENTS = new Set([
  "person_detection",
  "vehicle_detection",
  "suspicious_motion",
  "line_crossing",
  "zone_intrusion",
  "camera_tamper",
  "camera_offline",
]);

function parseArgs(argv) {
  const out = {
    once: false,
    dryRun: false,
    registry: process.env.CAMERA_REGISTRY_PATH || "",
    registryUrl: process.env.CAMERA_REGISTRY_URL || "",
    intervalMs: Number(process.env.CAMERA_AI_INTERVAL_MS || 15000),
    maxCameras: Number(process.env.CAMERA_AI_MAX_CAMERAS || 12),
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") out.once = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--registry") out.registry = argv[++i];
    else if (arg === "--registry-url") out.registryUrl = argv[++i];
    else if (arg === "--interval-ms") out.intervalMs = Number(argv[++i]);
    else if (arg === "--max-cameras") out.maxCameras = Number(argv[++i]);
  }
  return out;
}

function requestBuffer(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.request(url, { method: options.method || "GET", headers: options.headers || {} }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        if ((res.statusCode || 0) >= 400) return reject(new Error(`request returned ${res.statusCode}: ${body.toString("utf8").slice(0, 240)}`));
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject);
    req.setTimeout(Number(options.timeoutMs || 8000), () => req.destroy(new Error("request timed out")));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function requestJson(url, payload, options = {}) {
  const body = JSON.stringify(payload || {});
  const res = await requestBuffer(url, {
    method: options.method || "POST",
    timeoutMs: options.timeoutMs || 10000,
    headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), ...(options.headers || {}) },
    body,
  });
  try {
    return JSON.parse(res.body.toString("utf8") || "{}");
  } catch {
    return { ok: true, raw: res.body.toString("utf8").slice(0, 500) };
  }
}

function snapshotUrlForCamera(camera) {
  if (camera.snapshot_url) return camera.snapshot_url;
  if (String(camera.protocol || "").toLowerCase() === "http_snapshot" && camera.http_snapshot_url) return camera.http_snapshot_url;
  const go2rtc = cleanBaseUrl(process.env.GO2RTC_API_URL || DEFAULT_GO2RTC_API_URL);
  return `${go2rtc}/api/frame.jpeg?src=${encodeURIComponent(streamId(camera))}`;
}

function normalizeEventType(value) {
  const text = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (/person|human/.test(text)) return "person_detection";
  if (/vehicle|car|truck|bike|motor/.test(text)) return "vehicle_detection";
  if (/line/.test(text)) return "line_crossing";
  if (/zone|intrusion|area/.test(text)) return "zone_intrusion";
  if (/tamper|covered|obstruct|moved/.test(text)) return "camera_tamper";
  if (/offline|unreachable|stream_failed/.test(text)) return "camera_offline";
  if (/motion|movement/.test(text)) return "suspicious_motion";
  return "";
}

function normalizeDetections(camera, response) {
  const rows = Array.isArray(response?.detections) ? response.detections : Array.isArray(response?.events) ? response.events : [];
  return rows.map((row) => {
    const eventType = normalizeEventType(row.event_type || row.type || row.label || row.class || row.name);
    if (!ALLOWED_EVENTS.has(eventType)) return null;
    const confidence = Number(row.confidence ?? row.score ?? response?.confidence ?? 0);
    return {
      event_type: eventType,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
      title: row.title || `${eventType.replace(/_/g, " ")} detected`,
      message: row.message || `${eventType.replace(/_/g, " ")} detected on ${camera.name || camera.camera_id || "camera"}.`,
      bbox: Array.isArray(row.bbox) ? row.bbox : undefined,
      zone: row.zone || row.zone_id || undefined,
      raw_label: row.label || row.class || row.type || undefined,
    };
  }).filter(Boolean);
}

async function detect(camera, snapshot) {
  const bridgeUrl = cleanBaseUrl(process.env.YOLO_BRIDGE_URL || "");
  if (!bridgeUrl) return { mode: "noop", detections: [], reason: "YOLO_BRIDGE_URL not configured" };
  const response = await requestJson(`${bridgeUrl}/detect`, {
    camera_id: camera.camera_id || camera.id,
    stream_key: streamId(camera),
    image_base64: snapshot.body.toString("base64"),
    metadata: { camera_name: camera.name || null, provider: camera.provider || null, protocol: camera.protocol || null },
  }, { timeoutMs: Number(process.env.YOLO_BRIDGE_TIMEOUT_MS || 12000) });
  return { mode: "external_yolo_bridge", detections: normalizeDetections(camera, response), bridge_status: response?.ok === false ? "failed" : "ok" };
}

function edgeHeaders() {
  const token = process.env.OYI_EDGE_AGENT_TOKEN || process.env.EDGE_AGENT_TOKEN || process.env.CAMERA_REGISTRY_TOKEN || process.env.BACKEND_TOKEN || "";
  const agentId = process.env.AGENT_ID || process.env.EDGE_AGENT_ID || defaultAgentId();
  return {
    token,
    agentId,
    headers: token ? { Authorization: `Bearer ${token}`, "x-edge-token": token, "x-edge-agent-id": agentId } : { "x-edge-agent-id": agentId },
  };
}

async function postDetection(camera, detection, snapshotInfo, registry) {
  const backend = cleanBaseUrl(process.env.CLOUD_URL || process.env.BACKEND_URL || process.env.OYI_BACKEND_URL || "");
  if (!backend) return { ok: false, skipped: true, reason: "backend_url_missing" };
  const { token, agentId, headers } = edgeHeaders();
  if (!token) return { ok: false, skipped: true, reason: "edge_token_missing" };
  const cameraId = camera.camera_id || camera.id;
  const estateId = registry.site_id || camera.estate_id || process.env.SITE_ID || process.env.ESTATE_ID || "";
  const coreEvent = normalizeEvent({
    agent_id: "camera",
    surface: "edge",
    actor_id: agentId,
    estate_id: estateId,
    camera_id: cameraId,
    event_type: detection.event_type,
    category: "Camera",
    title: detection.title,
    summary: detection.message,
    confidence: detection.confidence >= 0.8 ? "confirmed" : detection.confidence >= 0.5 ? "probable" : "possible",
    source: "edge_camera_ai",
    metadata: { stream_key: streamId(camera), detector: "camera_ai_processor_v1" },
  });
  return requestJson(`${backend}/edge/cameras/${encodeURIComponent(cameraId)}/events`, {
    site_id: estateId,
    agent_id: agentId,
    event_type: detection.event_type,
    confidence: detection.confidence,
    title: detection.title,
    message: detection.message,
    detections: [detection],
    detector: { name: "camera_ai_processor_v1", mode: snapshotInfo.detector_mode },
    metadata: { stream_key: streamId(camera), snapshot_url: snapshotInfo.snapshot_url_redacted, core_event: coreEvent, bbox: detection.bbox || null, zone: detection.zone || null },
  }, { headers });
}

async function processCamera(camera, registry, options) {
  const id = camera.camera_id || camera.id || streamId(camera);
  const snapshotUrl = snapshotUrlForCamera(camera);
  const streamKey = streamId(camera);
  if (options.dryRun) {
    const detector = await detect(camera, { body: Buffer.from("") });
    return { camera_id: id, stream_key: streamKey, snapshot_url: redactUrl(snapshotUrl), detector_mode: detector.mode, detections: detector.detections.length, posted: 0, dry_run: true, reason: detector.reason || null };
  }

  let snapshot;
  try {
    snapshot = await requestBuffer(snapshotUrl, { timeoutMs: Number(process.env.CAMERA_AI_SNAPSHOT_TIMEOUT_MS || 8000) });
  } catch (error) {
    const offline = { event_type: "camera_offline", confidence: 1, title: "Camera stream unavailable", message: `${camera.name || id} could not provide a snapshot.` };
    const posted = await postDetection(camera, offline, { detector_mode: "stream_health", snapshot_url_redacted: redactUrl(snapshotUrl) }, registry);
    return { camera_id: id, stream_key: streamKey, snapshot_error: error.message, posted: posted?.ok === false ? 0 : 1, event_type: "camera_offline" };
  }

  const detector = await detect(camera, snapshot);
  const posted = [];
  for (const detection of detector.detections) {
    posted.push(await postDetection(camera, detection, { detector_mode: detector.mode, snapshot_url_redacted: redactUrl(snapshotUrl) }, registry));
  }
  return { camera_id: id, stream_key: streamKey, snapshot_bytes: snapshot.body.length, detector_mode: detector.mode, detections: detector.detections.length, posted: posted.filter((item) => item && item.ok !== false).length };
}

async function runOnce(options) {
  const loaded = await loadRegistry({ registry: options.registry, registryUrl: options.registryUrl, fallbackLocalOnRemoteError: options.dryRun });
  const registry = loaded.registry || {};
  const cameras = (registry.cameras || []).filter((camera) => camera.enabled !== false).slice(0, Math.max(1, options.maxCameras || 12));
  const results = [];
  for (const camera of cameras) {
    try {
      results.push(await processCamera(camera, registry, options));
    } catch (error) {
      results.push({ camera_id: camera.camera_id || camera.id || streamId(camera), ok: false, error: error.message });
    }
  }
  const summary = {
    ok: true,
    run_id: crypto.randomUUID(),
    dry_run: options.dryRun,
    registry_source: loaded.source,
    cameras_loaded: cameras.length,
    detections: results.reduce((sum, item) => sum + Number(item.detections || 0), 0),
    events_posted: results.reduce((sum, item) => sum + Number(item.posted || 0), 0),
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.once || options.dryRun) {
    await runOnce({ ...options, once: true });
    return;
  }
  while (true) {
    await runOnce(options);
    await new Promise((resolve) => setTimeout(resolve, Math.max(5000, options.intervalMs || 15000)));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
