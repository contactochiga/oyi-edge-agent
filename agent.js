require("dotenv").config();
const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const env = process.env;

const BASE_CONFIG = {
  AGENT_ID: env.AGENT_ID,
  SITE_ID: env.SITE_ID,
  CLOUD_URL: env.CLOUD_URL,
  EDGE_AGENT_TOKEN: env.OYI_EDGE_AGENT_TOKEN || env.EDGE_AGENT_TOKEN,
  CAMERA_IP: env.CAMERA_IP,
  ONVIF_PORT: Number(env.ONVIF_PORT || 8080),
  ONVIF_USER: env.ONVIF_USER,
  ONVIF_PASS: env.ONVIF_PASS,
  EDGE_REGISTER_PATH: env.EDGE_REGISTER_PATH || "/edge/agent/register",
  EDGE_HEARTBEAT_PATH: env.EDGE_HEARTBEAT_PATH || "/edge/agent/heartbeat",
  EDGE_DISCOVERY_PUSH_PATH:
    env.EDGE_DISCOVERY_PUSH_PATH || "/edge/discovery/push",
  EDGE_CONFIG_PATH: env.EDGE_CONFIG_PATH || "/edge/agent/config",
  HEARTBEAT_INTERVAL_MS: Number(env.HEARTBEAT_INTERVAL_MS || 30_000),
  DISCOVERY_INTERVAL_MS: Number(env.DISCOVERY_INTERVAL_MS || 120_000),
  CONFIG_PULL_INTERVAL_MS: Number(env.CONFIG_PULL_INTERVAL_MS || 180_000),
  QUEUE_FLUSH_INTERVAL_MS: Number(env.QUEUE_FLUSH_INTERVAL_MS || 5_000),
  REQUEST_TIMEOUT_MS: Number(env.REQUEST_TIMEOUT_MS || 10_000),
  RETRY_BASE_MS: Number(env.RETRY_BASE_MS || 2_000),
  RETRY_MAX_MS: Number(env.RETRY_MAX_MS || 60_000),
  LOCAL_QUEUE_PATH: env.LOCAL_QUEUE_PATH || "./data/outbox.json",
  HEALTH_PORT: Number(env.HEALTH_PORT || 9090),
  GO2RTC_API_URL: env.GO2RTC_API_URL || "http://127.0.0.1:1984",
  LEGACY_MODE: String(env.LEGACY_MODE || "false") === "true",
};

const CAPABILITIES = [
  "discovery_push",
  "heartbeat",
  "durable_outbox",
  "config_pull",
  "health_endpoint",
];

const state = {
  startedAt: Date.now(),
  stopped: false,
  lastSuccess: {},
  lastError: {},
  timers: {
    heartbeat: null,
    discovery: null,
    configPull: null,
    queueFlush: null,
  },
  server: null,
  remoteConfig: {},
  go2rtc: {
    reachable: false,
    configured_streams: 0,
    healthy_streams: 0,
    last_checked_at: null,
    error: null,
  },
};

const client = axios.create({
  timeout: BASE_CONFIG.REQUEST_TIMEOUT_MS,
});

client.interceptors.request.use((config) => {
  const cfg = getEffectiveConfig();
  if (cfg.EDGE_AGENT_TOKEN) {
    config.headers = {
      ...(config.headers || {}),
      "x-edge-token": cfg.EDGE_AGENT_TOKEN,
      Authorization: `Bearer ${cfg.EDGE_AGENT_TOKEN}`,
      "x-edge-agent-id": cfg.AGENT_ID,
      "x-edge-site-id": cfg.SITE_ID,
    };
  }
  return config;
});

function log(level, event, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

function validateEnv() {
  if (!BASE_CONFIG.AGENT_ID || !BASE_CONFIG.SITE_ID || !BASE_CONFIG.CLOUD_URL) {
    throw new Error("Missing AGENT_ID / SITE_ID / CLOUD_URL in .env");
  }
}

function cloudUrl(pathname) {
  return `${String(BASE_CONFIG.CLOUD_URL).replace(/\/$/, "")}${pathname}`;
}

function getEffectiveConfig() {
  return {
    ...BASE_CONFIG,
    ...state.remoteConfig,
    ONVIF_PORT: Number(state.remoteConfig.ONVIF_PORT || BASE_CONFIG.ONVIF_PORT),
  };
}

function buildDevices() {
  const cfg = getEffectiveConfig();
  if (!cfg.CAMERA_IP) {
    return [];
  }
  const onvifPort = Number(cfg.ONVIF_PORT || 8080);
  return [
    {
      ip: cfg.CAMERA_IP,
      onvif_port: onvifPort,
      xaddr: `http://${cfg.CAMERA_IP}:${onvifPort}/onvif/device_service`,
      credential_ref: cfg.ONVIF_USER || cfg.ONVIF_PASS ? "local:onvif-default" : null,
      credentials_present: Boolean(cfg.ONVIF_USER || cfg.ONVIF_PASS),
      source: "edge-static-config",
    },
  ];
}

function backoffMs(attempts) {
  const cfg = getEffectiveConfig();
  const ms = cfg.RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1);
  return Math.min(ms, cfg.RETRY_MAX_MS);
}

function nowIso() {
  return new Date().toISOString();
}

function errMessage(err) {
  return err?.response?.data || err?.message || "unknown error";
}

async function checkGo2rtc() {
  const cfg = getEffectiveConfig();
  const base = String(cfg.GO2RTC_API_URL || "").replace(/\/$/, "");
  if (!base) return state.go2rtc;
  try {
    const res = await axios.get(`${base}/api/streams`, { timeout: 2000 });
    const streams = res.data && typeof res.data === "object" ? Object.keys(res.data) : [];
    state.go2rtc = {
      reachable: true,
      configured_streams: streams.length,
      healthy_streams: streams.length,
      last_checked_at: nowIso(),
      error: null,
    };
  } catch (err) {
    state.go2rtc = {
      reachable: false,
      configured_streams: 0,
      healthy_streams: 0,
      last_checked_at: nowIso(),
      error: String(errMessage(err)),
    };
  }
  return state.go2rtc;
}

class Outbox {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.items = [];
    this.pendingWrite = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.items = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      await this.persist();
    }
  }

  async persist() {
    this.pendingWrite = this.pendingWrite.then(() =>
      fs.writeFile(this.filePath, JSON.stringify(this.items, null, 2))
    );
    return this.pendingWrite;
  }

  depth() {
    return this.items.length;
  }

  dueItems() {
    const now = Date.now();
    return this.items.filter((item) => Number(item.next_attempt_at_ms || 0) <= now);
  }

  async enqueue(item) {
    this.items.push(item);
    await this.persist();
  }

  async markSuccess(id) {
    this.items = this.items.filter((item) => item.id !== id);
    await this.persist();
  }

  async markFailure(id, message) {
    this.items = this.items.map((item) => {
      if (item.id !== id) return item;
      const attempts = Number(item.attempts || 0) + 1;
      const delayMs = backoffMs(attempts);
      return {
        ...item,
        attempts,
        last_error: String(message),
        next_attempt_at_ms: Date.now() + delayMs,
        updated_at: nowIso(),
      };
    });
    await this.persist();
  }
}

const outbox = new Outbox(BASE_CONFIG.LOCAL_QUEUE_PATH);

async function postEvent(pathname, payload, metadata = {}) {
  const res = await client.post(cloudUrl(pathname), payload);
  return { status: res.status, data: res.data, metadata };
}

async function postOrEnqueue(eventType, pathname, payload) {
  try {
    const res = await postEvent(pathname, payload, { eventType });
    state.lastSuccess[eventType] = nowIso();
    log("info", `${eventType}.ok`, { status: res.status });
    return true;
  } catch (err) {
    const msg = errMessage(err);
    state.lastError[eventType] = `${nowIso()} ${msg}`;
    const queued = {
      id: crypto.randomUUID(),
      event_type: eventType,
      path: pathname,
      payload,
      attempts: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      next_attempt_at_ms: Date.now(),
    };
    await outbox.enqueue(queued);
    log("error", `${eventType}.failed.enqueued`, {
      error: String(msg),
      outbox_depth: outbox.depth(),
    });
    return false;
  }
}

async function flushOutbox() {
  const due = outbox.dueItems();
  if (due.length === 0) return;

  for (const item of due) {
    try {
      await postEvent(item.path, item.payload, { replay: true });
      await outbox.markSuccess(item.id);
      state.lastSuccess.queue_flush = nowIso();
      log("info", "outbox.replay.ok", {
        event_type: item.event_type,
        outbox_depth: outbox.depth(),
      });
    } catch (err) {
      const msg = errMessage(err);
      await outbox.markFailure(item.id, msg);
      state.lastError.queue_flush = `${nowIso()} ${msg}`;
      log("error", "outbox.replay.failed", {
        event_type: item.event_type,
        error: String(msg),
        outbox_depth: outbox.depth(),
      });
    }
  }
}

async function registerAgent() {
  const cfg = getEffectiveConfig();
  if (cfg.LEGACY_MODE) {
    log("info", "register.skipped", { reason: "legacy_mode" });
    return;
  }
  const payload = {
    site_id: cfg.SITE_ID,
    agent_id: cfg.AGENT_ID,
    status: "online",
    started_at: nowIso(),
    capabilities: CAPABILITIES,
    local_host: `http://127.0.0.1:${cfg.HEALTH_PORT}`,
    runtime_version: require("./package.json").version,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
  };
  await postOrEnqueue("register", cfg.EDGE_REGISTER_PATH, payload);
}

async function sendHeartbeat() {
  const cfg = getEffectiveConfig();
  if (cfg.LEGACY_MODE) return;
  const payload = {
    site_id: cfg.SITE_ID,
    agent_id: cfg.AGENT_ID,
    status: "online",
    ts: nowIso(),
    outbox_depth: outbox.depth(),
    queue_depth: outbox.depth(),
    camera_count: buildDevices().length,
    device_count: buildDevices().length,
    sync_status: outbox.depth() ? "degraded" : "synced",
    error_count: Object.keys(state.lastError).length,
    runtime_version: require("./package.json").version,
    local_runtime_host: `http://127.0.0.1:${cfg.HEALTH_PORT}`,
  };
  await postOrEnqueue("heartbeat", cfg.EDGE_HEARTBEAT_PATH, payload);
}

async function pushDiscovery() {
  const cfg = getEffectiveConfig();
  const devices = buildDevices();
  if (devices.length === 0) {
    log("info", "discovery.skipped", { reason: "no_camera_ip" });
    return;
  }
  const payload = {
    site_id: cfg.SITE_ID,
    agent_id: cfg.AGENT_ID,
    devices,
  };
  await postOrEnqueue("discovery", cfg.EDGE_DISCOVERY_PUSH_PATH, payload);
}

async function pullRemoteConfig() {
  const cfg = getEffectiveConfig();
  try {
    const res = await client.get(cloudUrl(cfg.EDGE_CONFIG_PATH), {
      params: { site_id: cfg.SITE_ID, agent_id: cfg.AGENT_ID },
    });
    const data = res.data && typeof res.data === "object" ? res.data : {};
    state.remoteConfig = data;
    state.lastSuccess.config_pull = nowIso();
    log("info", "config_pull.ok", { keys: Object.keys(data).length });
    resetIntervalTimersIfChanged();
  } catch (err) {
    const msg = errMessage(err);
    state.lastError.config_pull = `${nowIso()} ${msg}`;
    log("error", "config_pull.failed", { error: String(msg) });
  }
}

function timerMs(name) {
  const cfg = getEffectiveConfig();
  if (name === "heartbeat") return safeMs(cfg.HEARTBEAT_INTERVAL_MS, 30_000);
  if (name === "discovery") return safeMs(cfg.DISCOVERY_INTERVAL_MS, 120_000);
  if (name === "configPull") return safeMs(cfg.CONFIG_PULL_INTERVAL_MS, 180_000);
  if (name === "queueFlush") return safeMs(cfg.QUEUE_FLUSH_INTERVAL_MS, 5_000);
  return 10_000;
}

function safeMs(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1000) return fallback;
  return parsed;
}

const activeIntervals = {
  heartbeat: 0,
  discovery: 0,
  configPull: 0,
  queueFlush: 0,
};

function restartTimer(name, task) {
  const nextMs = timerMs(name);
  if (state.timers[name]) clearInterval(state.timers[name]);
  state.timers[name] = setInterval(() => {
    if (!state.stopped) task().catch((err) => {
      log("error", `${name}.task.failed`, { error: String(errMessage(err)) });
    });
  }, nextMs);
  activeIntervals[name] = nextMs;
}

function resetIntervalTimersIfChanged() {
  if (state.stopped) return;
  const desired = {
    heartbeat: timerMs("heartbeat"),
    discovery: timerMs("discovery"),
    configPull: timerMs("configPull"),
    queueFlush: timerMs("queueFlush"),
  };
  if (desired.heartbeat !== activeIntervals.heartbeat) {
    restartTimer("heartbeat", sendHeartbeat);
  }
  if (desired.discovery !== activeIntervals.discovery) {
    restartTimer("discovery", pushDiscovery);
  }
  if (desired.configPull !== activeIntervals.configPull) {
    restartTimer("configPull", pullRemoteConfig);
  }
  if (desired.queueFlush !== activeIntervals.queueFlush) {
    restartTimer("queueFlush", flushOutbox);
  }
}

function startHealthServer() {
  const cfg = getEffectiveConfig();
  const server = http.createServer(async (req, res) => {
    if (req.url !== "/healthz") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    res.setHeader("content-type", "application/json");
    const go2rtc = await checkGo2rtc();
    res.end(
      JSON.stringify({
        ok: !state.stopped,
        ts: nowIso(),
        uptime_seconds: Math.floor((Date.now() - state.startedAt) / 1000),
        agent_id: cfg.AGENT_ID,
        site_id: cfg.SITE_ID,
        outbox_depth: outbox.depth(),
        backend_reachable: Boolean(state.lastSuccess.heartbeat || state.lastSuccess.register),
        edge_registered: Boolean(state.lastSuccess.register),
        go2rtc_reachable: go2rtc.reachable,
        configured_streams: go2rtc.configured_streams,
        healthy_streams: go2rtc.healthy_streams,
        go2rtc,
        intervals_ms: activeIntervals,
        last_success: state.lastSuccess,
        last_error: state.lastError,
      })
    );
  });

  server.listen(cfg.HEALTH_PORT, "0.0.0.0", () => {
    log("info", "health_server.started", { port: cfg.HEALTH_PORT });
  });
  state.server = server;
}

async function shutdown(signal) {
  if (state.stopped) return;
  state.stopped = true;
  Object.values(state.timers).forEach((timer) => {
    if (timer) clearInterval(timer);
  });
  if (state.server) {
    await new Promise((resolve) => state.server.close(resolve));
  }
  log("info", "agent.stopped", { signal });
}

async function main() {
  validateEnv();
  await outbox.init();
  startHealthServer();

  log("info", "agent.started", {
    agent_id: BASE_CONFIG.AGENT_ID,
    site_id: BASE_CONFIG.SITE_ID,
    cloud_url: BASE_CONFIG.CLOUD_URL,
    outbox_path: path.resolve(BASE_CONFIG.LOCAL_QUEUE_PATH),
  });

  await registerAgent();
  await pushDiscovery();
  await sendHeartbeat();
  await pullRemoteConfig();
  await flushOutbox();

  restartTimer("heartbeat", sendHeartbeat);
  restartTimer("discovery", pushDiscovery);
  restartTimer("configPull", pullRemoteConfig);
  restartTimer("queueFlush", flushOutbox);

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((err) =>
      log("error", "shutdown.failed", { error: String(errMessage(err)) })
    );
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((err) =>
      log("error", "shutdown.failed", { error: String(errMessage(err)) })
    );
  });
}

main().catch((err) => {
  log("error", "agent.start.failed", { error: String(errMessage(err)) });
  process.exit(1);
});
