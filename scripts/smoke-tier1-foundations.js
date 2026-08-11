const assert = require("assert");
const { EVENT_CATEGORIES, normalizeEvent } = require("../src/edge/intelligence-events");
const {
  normalizeProvider,
  normalizeProtocol,
  streamId,
  credentialSummary,
} = require("./edge-camera-common");

async function main() {
  assert(EVENT_CATEGORIES.includes("edge"));
  assert(EVENT_CATEGORIES.includes("camera"));

  const event = normalizeEvent({
    agent_id: "camera",
    event_type: "camera_offline",
    category: "camera",
    title: "Front gate camera offline",
  });
  assert.equal(event.surface, "edge");
  assert.equal(event.category, "camera");
  assert.equal(event.event_type, "camera_offline");

  assert.equal(normalizeProvider("HikVision"), "hikvision");
  assert.equal(normalizeProtocol("RTSP"), "rtsp");
  assert.equal(streamId({ camera_id: "Front Gate Camera" }), "Front_Gate_Camera");

  const credentials = credentialSummary([
    { camera_id: "cam-1", credential_ref: "front_gate" },
    { camera_id: "cam-2", credential_ref: "front_gate" },
  ], {
    EDGE_CREDENTIAL_FRONT_GATE_USER: "configured",
    EDGE_CREDENTIAL_FRONT_GATE_PASS: "configured",
  });
  assert.equal(credentials.length, 1);
  assert.equal(credentials[0].ready, true);

  console.log("tier1 edge foundation smoke checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
