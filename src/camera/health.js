const { streamId } = require("./contracts");

function cameraHealth(camera, go2rtcStreams, observedAt = new Date().toISOString()) {
  const id = streamId(camera.id);
  const stream = go2rtcStreams && typeof go2rtcStreams === "object" ? go2rtcStreams[id] : null;
  const producers = Array.isArray(stream?.producers) ? stream.producers : [];
  const consumers = Array.isArray(stream?.consumers) ? stream.consumers : [];
  const reachable = Boolean(stream && (producers.length || stream.source || stream.url));
  return {
    cameraId: camera.id,
    streamId: id,
    state: reachable ? "stream_available" : stream ? "degraded" : "configured",
    reachable,
    streamAvailable: reachable,
    activeConsumers: consumers.length,
    observedAt,
    frameFreshnessAt: null,
    capabilities: { live: reachable ? "available" : "unknown", frameFreshness: "unknown" },
  };
}

module.exports = { cameraHealth };
