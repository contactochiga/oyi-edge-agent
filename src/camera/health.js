const { streamId } = require("./contracts");

function cameraHealth(camera, go2rtcStreams, observedAt = new Date().toISOString()) {
  const id = streamId(camera.id);
  const stream = go2rtcStreams && typeof go2rtcStreams === "object" ? go2rtcStreams[id] : null;
  const producers = Array.isArray(stream?.producers) ? stream.producers : [];
  const consumers = Array.isArray(stream?.consumers) ? stream.consumers : [];
  // Inspection proves registry/producer presence, not reachability or video.
  const reachable = null;
  return {
    cameraId: camera.id,
    streamId: id,
    state: producers.length ? "producer_present" : stream ? "configured" : "not_configured",
    reachable,
    streamAvailable: null,
    activeConsumers: consumers.length,
    observedAt,
    frameFreshnessAt: null,
    capabilities: { live: "unknown", frameFreshness: "unknown" },
  };
}

module.exports = { cameraHealth };
