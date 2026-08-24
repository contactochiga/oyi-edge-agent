const crypto = require("crypto");

const ERROR_CODES = new Set(["camera_not_found","camera_auth_failed","onvif_unreachable","rtsp_unavailable","stream_unavailable","edge_unreachable","discovery_timeout","unsupported_device","duplicate_camera","scope_conflict","invalid_discovery_scope","expired_command","snapshot_unavailable","media_capture_failed","media_upload_failed"]);

function clean(value) { return String(value || "").trim(); }
function safeError(code, message = "") { return { code: ERROR_CODES.has(code) ? code : "unsupported_device", message: clean(message).slice(0, 180) || "Camera operation could not be completed." }; }
function fingerprint(input = {}) {
  const stable = [input.endpointUuid, input.serialNumber, input.hardwareId, input.macAddress].map(clean).find(Boolean)
    || [input.manufacturer, input.model, input.hostname, input.xaddrIdentity].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
  if (!stable) throw new Error("stable camera discovery identity unavailable");
  return `camfp_${crypto.createHash("sha256").update(stable).digest("hex")}`;
}
function streamId(cameraId) {
  const id = clean(cameraId);
  if (!/^[0-9a-zA-Z_-]{8,128}$/.test(id)) throw new Error("invalid canonical camera id");
  return id.replace(/[^0-9a-zA-Z_-]/g, "_");
}

module.exports = { ERROR_CODES, fingerprint, safeError, streamId };
