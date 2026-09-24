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
const { ExternalDetectorProvider } = require("../src/camera/providers/external-detector");
const { CameraInferenceRuntime } = require("../src/camera/inference-runtime");
const { DetectionOutbox } = require("../src/camera/detection-outbox");
const detectionOutbox=new DetectionOutbox();
const {canonicalId,frameObservation,inferenceObservation,batches}=require('../src/camera/observations');
const {captureSnapshot}=require('../src/camera/snapshot');
const observationOutbox=new DetectionOutbox(process.env.CAMERA_OBSERVATION_OUTBOX_PATH||require('path').join(process.cwd(),'data/camera-observation-outbox.json'),500);

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
        if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) return reject(new Error(`request returned ${res.statusCode}`));
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

async function detect(camera, snapshot) {
  const bridgeUrl = cleanBaseUrl(process.env.YOLO_BRIDGE_URL || "");
  const provider=new ExternalDetectorProvider({url:bridgeUrl,requestJson,timeoutMs:Number(process.env.YOLO_BRIDGE_TIMEOUT_MS||12000)});
  if(!bridgeUrl)return{mode:"noop",detections:[],reason:"YOLO_BRIDGE_URL not configured",providerHealth:provider.health()};
  const runtime=new CameraInferenceRuntime(provider,{sampleIntervalMs:Number(process.env.CAMERA_AI_SAMPLE_INTERVAL_MS||15000),minimumConfidence:Number(process.env.CAMERA_AI_MIN_CONFIDENCE||.5),enabledDetectionTypes:String(process.env.CAMERA_AI_ENABLED_TYPES||"motion,person,vehicle").split(",").map(v=>v.trim()).filter(Boolean)});
  const result=await runtime.sample(camera,snapshot.body,{streamKey:streamId(camera),cameraName:camera.name});
  return{mode:"external_detector",...result,providerHealth:provider.health()};
}

function edgeHeaders() {
  const token = process.env.OYI_EDGE_AGENT_TOKEN || process.env.EDGE_AGENT_TOKEN || process.env.CAMERA_REGISTRY_TOKEN || process.env.BACKEND_TOKEN || "";
  const agentId = process.env.AGENT_ID || process.env.EDGE_AGENT_ID || defaultAgentId();
  const siteId = process.env.SITE_ID || process.env.ESTATE_ID || "";
  return {
    token,
    agentId,
    siteId,
    headers: token ? { Authorization: `Bearer ${token}`, "x-edge-token": token, "x-edge-agent-id": agentId, "x-edge-site-id": siteId } : { "x-edge-agent-id": agentId, "x-edge-site-id": siteId },
  };
}

async function postDetections(camera, detections, snapshotInfo, registry, mediaId = null) {
  const backend = cleanBaseUrl(process.env.CLOUD_URL || process.env.BACKEND_URL || process.env.OYI_BACKEND_URL || "");
  if (!backend) return { ok: false, skipped: true, reason: "backend_url_missing" };
  const { token, agentId, headers } = edgeHeaders();
  if (!token) return { ok: false, skipped: true, reason: "edge_token_missing" };
  const cameraId = canonicalId(camera);
  const estateId = registry.site_id || camera.estate_id || process.env.SITE_ID || process.env.ESTATE_ID || "";
  const body={
    site_id: estateId,
    agent_id: agentId,
    detections,
    provider: snapshotInfo.detector_mode,
    model: snapshotInfo.model||null,
    model_version: snapshotInfo.modelVersion||null,
    media_id: mediaId,
  };try{return await requestJson(`${backend}/edge/cameras/${encodeURIComponent(cameraId)}/detections`,body,{headers})}catch(error){const idempotencyKey=crypto.createHash("sha256").update(`${cameraId}:${detections.map(d=>d.idempotency_key||d.provider_observation_id||`${d.type}:${d.observed_at}`).join(",")}`).digest("hex");detectionOutbox.enqueue({idempotencyKey,cameraId,body});return{ok:false,queued:true,reason:"backend_unavailable"}}
}

async function persistEventSnapshot(camera,snapshot,registry,detections){const backend=cleanBaseUrl(process.env.CLOUD_URL||process.env.BACKEND_URL||process.env.OYI_BACKEND_URL||"");const {token,agentId,headers}=edgeHeaders();if(!backend||!token||!detections.length)return null;const cameraId=canonicalId(camera);const capturedAt=snapshot.capturedAt;const idempotency=crypto.createHash("sha256").update(`${cameraId}:${capturedAt}:${detections.map(d=>d.provider_observation_id||d.type).join(",")}`).digest("hex");const result=await requestJson(`${backend}/edge/cameras/${encodeURIComponent(cameraId)}/media`,{site_id:registry.site_id||camera.estate_id,agent_id:agentId,kind:"event_snapshot",mime_type:String(snapshot.headers?.["content-type"]||"image/jpeg").split(";")[0],data_base64:snapshot.body.toString("base64"),captured_at:capturedAt,idempotency_key:`detection:${idempotency}`,retention_class:"security",metadata:{source:"camera_detection_runtime"}},{headers,timeoutMs:15000});return result?.reference?.id||null}

async function processCamera(camera, registry, options) {
  const id = canonicalId(camera);
  if(!id)return{skipped:true,reason:'canonical_camera_id_required',detections:0,posted:0};
  const snapshotUrl = snapshotUrlForCamera(camera);
  const streamKey = streamId(camera);
  if (options.dryRun) {
    const detector = {mode:process.env.YOLO_BRIDGE_URL?'external_detector_configured':'noop',detections:[],reason:'dry_run_no_inference'};
    return { camera_id: id, stream_key: streamKey, snapshot_url: redactUrl(snapshotUrl), detector_mode: detector.mode, detections: detector.detections.length, posted: 0, dry_run: true, reason: detector.reason || null };
  }

  const capture=await captureSnapshot(streamKey,{url:snapshotUrl,timeoutMs:Number(process.env.CAMERA_AI_SNAPSHOT_TIMEOUT_MS||8000)});
  options.observations?.push(frameObservation(camera,edgeHeaders().agentId,capture,'ai_snapshot'));
  if(!capture.ok){
    return { camera_id: id, stream_key: streamKey, snapshot_error: "snapshot_unavailable", posted: 0, camera_health: "unknown", inference_health:"not_sampled" };
  }
  const snapshot={body:Buffer.from(capture.media.base64,'base64'),headers:{'content-type':capture.media.mimeType},capturedAt:capture.media.capturedAt};
  let detector;const inferenceStarted=Date.now();
  try{detector=await detect({...camera,camera_id:id},snapshot)}catch{
    options.observations?.push(inferenceObservation(camera,edgeHeaders().agentId,{error:true},Date.now()-inferenceStarted));
    return{camera_id:id,inference_error:'provider_failed',detections:0,posted:0};
  }
  options.observations?.push(inferenceObservation(camera,edgeHeaders().agentId,detector,Date.now()-inferenceStarted));
  let mediaId=null;try{mediaId=await persistEventSnapshot(camera,snapshot,registry,detector.detections)}catch{mediaId=null}
  const posted=detector.detections.length?[await postDetections(camera,detector.detections,{detector_mode:detector.mode,model:detector.model,modelVersion:detector.modelVersion},registry,mediaId)]:[];
  return { camera_id: id, stream_key: streamKey, snapshot_bytes: snapshot.body.length, detector_mode: detector.mode, provider_health:detector.providerHealth, metrics:detector.metrics, detections: detector.detections.length, media_persisted:Boolean(mediaId), posted: posted.filter((item) => item && item.ok !== false).length };
}

async function runOnce(options) {
  const backend=cleanBaseUrl(process.env.CLOUD_URL||process.env.BACKEND_URL||process.env.OYI_BACKEND_URL||"");const auth=edgeHeaders();const outbox=!options.dryRun&&backend&&auth.token?await detectionOutbox.flush(row=>requestJson(`${backend}/edge/cameras/${encodeURIComponent(row.cameraId)}/detections`,row.body,{headers:auth.headers})): {sent:0,pending:detectionOutbox.load().length};
  if(!options.dryRun&&backend&&auth.token)await observationOutbox.flush(row=>requestJson(`${backend}/edge/camera-observations`,row.body,{headers:auth.headers}));
  const registryUrl=options.registryUrl||(!options.registry&&backend&&!options.dryRun?`${backend}/edge/camera-observation-registry`:undefined);
  const registryEnv=registryUrl?.endsWith('/edge/camera-observation-registry')?{...process.env,CAMERA_REGISTRY_TOKEN:auth.token}:process.env;
  const loaded = await loadRegistry({ registry: options.registry, registryUrl, fallbackLocalOnRemoteError: options.dryRun },registryEnv);
  const registry = loaded.registry || {};
  const cameras = (registry.cameras || []).filter((camera) => camera.enabled !== false).slice(0, Math.max(1, options.maxCameras || 12));
  const results = [];
  const observations=[];
  for (const camera of cameras) {
    try {
      results.push(await processCamera(camera, registry, {...options,observations}));
    } catch (error) {
      results.push({ camera_id: camera.camera_id || camera.id || streamId(camera), ok: false, error: error.message });
    }
  }
  if(!options.dryRun)for(const batch of batches(observations.filter(Boolean))){
    const body={observations:batch},idempotencyKey=batch.map(o=>o.observation_id).join(':');
    try{if(!backend||!auth.token)throw Error('transport_unavailable');await requestJson(`${backend}/edge/camera-observations`,body,{headers:auth.headers});}
    catch{observationOutbox.enqueue({idempotencyKey,body})}
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
    detection_outbox:outbox,
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

module.exports={processCamera,runOnce};
if(require.main===module)main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
