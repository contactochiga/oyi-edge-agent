const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_LOCAL_REGISTRY = "edge/camera/registry/local.camera-registry.json";
const DEFAULT_EXAMPLE_REGISTRY = "examples/camera-registry.example.json";
const DEFAULT_GENERATED_CONFIG = "edge/camera/go2rtc/go2rtc.generated.yaml";
const DEFAULT_GO2RTC_API_URL = "http://127.0.0.1:1984";

const SUPPORTED_PROVIDERS = new Set(["generic_rtsp", "onvif", "hikvision", "dahua", "hilook", "uniview", "tuya_camera", "other"]);
const SUPPORTED_PROTOCOLS = new Set(["rtsp", "onvif", "hls", "mjpeg", "http_snapshot"]);

function repoPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function exists(file) {
  try {
    fs.accessSync(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function executable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function selectedRegistryPath(inputPath) {
  if (inputPath) return path.resolve(ROOT, inputPath);
  const localRegistry = repoPath(DEFAULT_LOCAL_REGISTRY);
  return exists(localRegistry) ? localRegistry : repoPath(DEFAULT_EXAMPLE_REGISTRY);
}

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function registryUrlFromEnv(env = process.env) {
  const explicit = String(env.CAMERA_REGISTRY_URL || "").trim();
  if (explicit) return explicit;
  const backend = cleanBaseUrl(env.CLOUD_URL || env.BACKEND_URL || env.OYI_BACKEND_URL);
  const estateId = String(env.SITE_ID || env.ESTATE_ID || env.OYI_ESTATE_ID || "").trim();
  if (!backend || !estateId) return "";
  return `${backend}/cameras/edge-registry/estate/${encodeURIComponent(estateId)}`;
}

function credentialEnvName(ref) {
  return String(ref || "").replace(/^local:/, "").replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
}

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

function streamId(camera) {
  return String(camera.stream_id || camera.camera_id || camera.id || camera.name || camera.host || "camera").replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function redactUrl(value) {
  const raw = String(value || "");
  return raw.replace(/(rtsp|http|https):\/\/([^:@/]+):([^@/]+)@/gi, "$1://***:***@").replace(/(token|password|pass|secret)=([^&\s]+)/gi, "$1=***");
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function authHeaders(token, agentId, siteId) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-edge-token"] = token;
  }
  if (agentId) headers["x-edge-agent-id"] = agentId;
  if (siteId) headers["x-edge-site-id"] = siteId;
  return headers;
}

function fetchJson(url, token, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, { headers: authHeaders(token, options.agentId, options.siteId) }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if ((res.statusCode || 0) >= 400) return reject(new Error(`registry url returned ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
    });
    req.on("error", reject);
    req.setTimeout(Number(options.timeoutMs || 8000), () => req.destroy(new Error("registry url timed out")));
  });
}

function normalizeRegistry(registry) {
  const cameras = Array.isArray(registry?.cameras) ? registry.cameras : [];
  return {
    ...registry,
    cameras: cameras.map((camera) => ({
      ...camera,
      camera_id: camera.camera_id || camera.id || camera.name,
      provider: normalizeProvider(camera.provider || camera.brand),
      protocol: normalizeProtocol(camera.protocol || camera.stream_protocol || "rtsp"),
      enabled: camera.enabled !== false,
    })),
  };
}

async function loadRegistry(args = {}, env = process.env) {
  const url = args.registryUrl || registryUrlFromEnv(env);
  if (url) {
    const token = env.CAMERA_REGISTRY_TOKEN || env.OYI_EDGE_AGENT_TOKEN || env.EDGE_AGENT_TOKEN || env.EDGE_BACKEND_TOKEN || env.BACKEND_TOKEN || "";
    try {
      const data = await fetchJson(url, token, { agentId: env.AGENT_ID || env.EDGE_AGENT_ID, siteId: env.SITE_ID || env.ESTATE_ID, timeoutMs: args.timeoutMs });
      return { source: "remote", registryPath: url, registry: normalizeRegistry(data), token_present: Boolean(token) };
    } catch (err) {
      if (!args.fallbackLocalOnRemoteError) throw err;
      const registryPath = selectedRegistryPath(args.registry);
      return {
        source: "local_fallback",
        registryPath,
        registry: normalizeRegistry(readJson(registryPath)),
        token_present: Boolean(token),
        remote_registry: url,
        remote_error: err.message,
      };
    }
  }
  const registryPath = selectedRegistryPath(args.registry);
  return { source: "local", registryPath, registry: normalizeRegistry(readJson(registryPath)), token_present: false };
}

function buildStreamUrl(camera, options = {}) {
  const dryRun = Boolean(options.dryRun);
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

function buildGo2rtcConfig(registry, options = {}) {
  const lines = ["api:", "  listen: \"0.0.0.0:1984\"", "streams:"];
  const streams = [];
  for (const camera of registry.cameras || []) {
    if (camera.enabled === false) continue;
    const id = streamId(camera);
    const url = buildStreamUrl(camera, { dryRun: options.dryRun });
    lines.push(`  ${id}: ${yamlString(url)}`);
    streams.push({
      camera_id: id,
      provider: normalizeProvider(camera.provider || camera.brand),
      protocol: normalizeProtocol(camera.protocol || camera.stream_protocol || "rtsp"),
      credential_ref: camera.credential_ref || null,
      status: "configurable",
    });
  }
  return { yaml: `${lines.join("\n")}\n`, streams };
}

function credentialSummary(cameras, env = process.env) {
  const refs = new Set();
  for (const camera of cameras || []) {
    if (camera.enabled === false) continue;
    if (camera.credential_ref) refs.add(camera.credential_ref);
  }
  return Array.from(refs).map((ref) => {
    const key = credentialEnvName(ref);
    const userPresent = Boolean(env[`EDGE_CREDENTIAL_${key}_USER`]);
    const passPresent = Boolean(env[`EDGE_CREDENTIAL_${key}_PASS`]);
    return { credential_ref: ref, env_key: key, user_present: userPresent, password_present: passPresent, ready: userPresent && passPresent };
  });
}

function checkHttpJson(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch {}
        resolve({ ok: (res.statusCode || 0) < 400, status: res.statusCode, body: parsed || body.slice(0, 120) });
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(timeoutMs, () => req.destroy(new Error("request timed out")));
  });
}

function defaultAgentId() {
  return `edge-${os.hostname().replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase()}`;
}

module.exports = {
  ROOT,
  DEFAULT_GENERATED_CONFIG,
  DEFAULT_GO2RTC_API_URL,
  buildGo2rtcConfig,
  checkHttpJson,
  cleanBaseUrl,
  credentialEnvName,
  credentialSummary,
  defaultAgentId,
  executable,
  exists,
  loadRegistry,
  normalizeProvider,
  normalizeProtocol,
  redactUrl,
  registryUrlFromEnv,
  repoPath,
  selectedRegistryPath,
  streamId,
};
