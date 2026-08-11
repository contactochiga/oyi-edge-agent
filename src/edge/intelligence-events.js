const EVENT_CATEGORIES = Object.freeze([
  "operational",
  "security",
  "maintenance",
  "visitor",
  "camera",
  "edge",
  "utility",
  "system",
]);

function normalizeEvent(input = {}) {
  const category = String(input.category || "operational").toLowerCase();
  return {
    id: input.id || undefined,
    actor_id: input.actor_id || input.actorId || null,
    agent_id: input.agent_id || input.agentId || "edge",
    surface: input.surface || "edge",
    estate_id: input.estate_id || input.estateId || null,
    home_id: input.home_id || input.homeId || null,
    camera_id: input.camera_id || input.cameraId || null,
    edge_node_id: input.edge_node_id || input.edgeNodeId || null,
    event_type: input.event_type || input.eventType || "edge.event",
    category: EVENT_CATEGORIES.includes(category) ? category : "operational",
    title: String(input.title || "Edge update").slice(0, 180),
    summary: String(input.summary || input.title || "Edge update").slice(0, 500),
    confidence: input.confidence || "confirmed",
    source: input.source || input.agent_id || "edge",
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    occurred_at: input.occurred_at || input.occurredAt || new Date().toISOString(),
  };
}

module.exports = {
  EVENT_CATEGORIES,
  normalizeEvent,
};
