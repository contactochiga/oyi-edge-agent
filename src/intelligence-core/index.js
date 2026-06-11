const CORE_ID = "ochiga_intelligence_core";

const MEMORY_SCOPES = Object.freeze([
  "user",
  "home",
  "estate",
  "facility",
  "office",
  "lead",
  "camera",
  "edge",
  "system",
]);

const AGENTS = Object.freeze([
  {
    id: "oyi",
    name: "Oyi Intelligence",
    domain: "resident home and estate operations",
    allowed_surfaces: ["consumer", "watch", "api"],
    tools: ["oyi:*"],
    memory_scope: ["user", "home", "estate"],
    risk_level: "medium",
    default_response_tone: "calm resident-facing home assistant",
  },
  {
    id: "oma",
    name: "Ochiga Marketing Agent",
    domain: "marketing qualification and lead capture",
    allowed_surfaces: ["office", "website", "widget", "whatsapp", "api"],
    tools: ["office:create_lead", "office:get_solution_fit", "office:notify_founder"],
    memory_scope: ["office", "lead"],
    risk_level: "medium",
    default_response_tone: "commercial, helpful, non-overclaiming",
  },
  {
    id: "osa",
    name: "Ochiga Sales Agent",
    domain: "sales follow-up, demos, proposals, and handoff",
    allowed_surfaces: ["office", "website", "widget", "whatsapp", "api"],
    tools: ["office:update_lead_status", "office:schedule_demo", "office:notify_founder"],
    memory_scope: ["office", "lead"],
    risk_level: "medium",
    default_response_tone: "commercial, precise, conversion-aware",
  },
  {
    id: "facility",
    name: "Facility Intelligence",
    domain: "estate and facility operations",
    allowed_surfaces: ["facility", "api"],
    tools: ["oyi:read", "facility:*", "camera:read"],
    memory_scope: ["facility", "estate", "system"],
    risk_level: "high",
    default_response_tone: "operational, concise, permission-aware",
  },
  {
    id: "edge",
    name: "Edge Intelligence",
    domain: "local runtime, physical devices, and camera edge health",
    allowed_surfaces: ["edge", "api"],
    tools: ["edge:health", "edge:camera_registry", "edge:stream_health"],
    memory_scope: ["edge", "camera", "system"],
    risk_level: "high",
    default_response_tone: "diagnostic, safe, local-runtime aware",
  },
  {
    id: "camera",
    name: "Camera Intelligence",
    domain: "camera events, stream health, and future detections",
    allowed_surfaces: ["facility", "camera", "edge", "api"],
    tools: ["camera:read", "camera:event_ingest", "camera:profile"],
    memory_scope: ["camera", "estate", "facility"],
    risk_level: "high",
    default_response_tone: "security-aware, factual, no fabricated detections",
  },
  {
    id: "watch",
    name: "Watch Intelligence",
    domain: "wrist awareness, quick actions, and home status",
    allowed_surfaces: ["watch", "consumer", "api"],
    tools: ["watch:summary", "watch:quick_actions", "oyi:scene"],
    memory_scope: ["user", "home"],
    risk_level: "medium",
    default_response_tone: "glanceable, compact, resident-safe",
  },
  {
    id: "twin",
    name: "Digital Twin Intelligence",
    domain: "future digital twin understanding",
    allowed_surfaces: ["facility", "office", "api"],
    tools: [],
    memory_scope: ["estate", "facility", "system"],
    risk_level: "high",
    default_response_tone: "spatial, operational, evidence-based",
  },
  {
    id: "plan_studio",
    name: "Plan Studio Intelligence",
    domain: "future planning and design workflows",
    allowed_surfaces: ["office", "api"],
    tools: [],
    memory_scope: ["office", "system"],
    risk_level: "medium",
    default_response_tone: "planning-focused and structured",
  },
]);

const OFFICE_TOOLS = Object.freeze([
  {
    id: "office:create_lead",
    source: "office",
    description: "Create or update a lead record from a marketing conversation.",
    categories: ["write", "marketing", "external"],
    required_permissions: ["crm.manage"],
    confirmation_required: false,
    enabled: true,
    risk_level: "medium",
    allowed_agents: ["oma"],
  },
  {
    id: "office:update_lead_status",
    source: "office",
    description: "Update lead routing, status, score, and next action.",
    categories: ["write", "sales"],
    required_permissions: ["crm.manage"],
    confirmation_required: false,
    enabled: true,
    risk_level: "medium",
    allowed_agents: ["oma", "osa"],
  },
  {
    id: "office:get_solution_fit",
    source: "office",
    description: "Score fit for Ochiga/Oyi solutions from lead context.",
    categories: ["read", "marketing", "sales"],
    required_permissions: ["office.read"],
    confirmation_required: false,
    enabled: true,
    risk_level: "low",
    allowed_agents: ["oma", "osa"],
  },
  {
    id: "office:schedule_demo",
    source: "office",
    description: "Record a requested demo and prepare calendar links.",
    categories: ["write", "sales", "external"],
    required_permissions: ["crm.manage"],
    confirmation_required: false,
    enabled: true,
    risk_level: "medium",
    allowed_agents: ["osa"],
  },
  {
    id: "office:notify_founder",
    source: "office",
    description: "Escalate a commercial lead to the founder/human owner.",
    categories: ["action", "sales", "external"],
    required_permissions: ["office.manage"],
    confirmation_required: false,
    enabled: true,
    risk_level: "medium",
    allowed_agents: ["oma", "osa"],
  },
]);

const EDGE_TOOLS = Object.freeze([
  {
    id: "edge:health",
    source: "edge",
    description: "Read Edge runtime, backend, and go2rtc health.",
    categories: ["read", "edge"],
    required_permissions: ["devices.read"],
    confirmation_required: false,
    enabled: true,
    risk_level: "low",
    allowed_agents: ["edge", "camera"],
  },
  {
    id: "edge:camera_registry",
    source: "edge",
    description: "Read camera registry contracts and generated stream mappings.",
    categories: ["read", "edge", "camera"],
    required_permissions: ["cameras.view"],
    confirmation_required: false,
    enabled: true,
    risk_level: "low",
    allowed_agents: ["edge", "camera"],
  },
  {
    id: "camera:event_ingest",
    source: "edge",
    description: "Submit verified camera events from Edge to backend camera event ingestion.",
    categories: ["write", "camera", "edge"],
    required_permissions: ["cameras.view"],
    confirmation_required: false,
    enabled: true,
    risk_level: "high",
    allowed_agents: ["edge", "camera"],
  },
]);

const TOOL_REGISTRY = Object.freeze([...OFFICE_TOOLS, ...EDGE_TOOLS]);

function getAgent(id) {
  return AGENTS.find((agent) => agent.id === id) || null;
}

function getToolsForAgent(agentId) {
  return TOOL_REGISTRY.filter((tool) => tool.allowed_agents.includes(agentId));
}

function normalizeEvent(input = {}) {
  return {
    id: input.id || undefined,
    actor_id: input.actor_id || input.actorId || null,
    agent_id: input.agent_id || input.agentId || "edge",
    surface: input.surface || "edge",
    estate_id: input.estate_id || input.estateId || null,
    home_id: input.home_id || input.homeId || null,
    office_id: input.office_id || input.officeId || null,
    camera_id: input.camera_id || input.cameraId || null,
    event_type: input.event_type || input.eventType || "intelligence.event",
    category: input.category || "Intelligence",
    title: String(input.title || "Intelligence update").slice(0, 180),
    summary: String(input.summary || input.title || "Intelligence update").slice(0, 500),
    confidence: input.confidence || "confirmed",
    source: input.source || input.agent_id || "edge",
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    occurred_at: input.occurred_at || input.occurredAt || new Date().toISOString(),
  };
}

function createAdapter(agentId) {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Unknown intelligence agent: ${agentId}`);
  return {
    agent,
    getContext(input = {}) {
      return {
        core_id: CORE_ID,
        agent_id: agent.id,
        surface: input.surface || agent.allowed_surfaces[0] || "api",
        actor_id: input.actor_id || null,
        user_id: input.user_id || null,
        estate_id: input.estate_id || null,
        home_id: input.home_id || null,
        office_id: input.office_id || null,
        lead_id: input.lead_id || null,
        camera_id: input.camera_id || null,
        edge_node_id: input.edge_node_id || null,
        permissions: Array.isArray(input.permissions) ? input.permissions : [],
        metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      };
    },
    getAllowedTools(context = {}) {
      const permissions = new Set(context.permissions || []);
      return getToolsForAgent(agent.id).filter((tool) =>
        tool.required_permissions.every((permission) => permissions.has(permission))
      );
    },
    writeMemory() {
      return { ok: false, skipped: true, reason: "phase1_contract_only_memory_adapter" };
    },
    writeTimelineEvent(_context, event) {
      return { ok: true, event: normalizeEvent({ ...event, agent_id: agent.id }) };
    },
    formatResponse(_context, response = {}) {
      return {
        message: response.message || "",
        ...response,
        metadata: {
          ...(response.metadata || {}),
          core_id: CORE_ID,
          agent_id: agent.id,
        },
      };
    },
  };
}

module.exports = {
  CORE_ID,
  MEMORY_SCOPES,
  AGENTS,
  OFFICE_TOOLS,
  EDGE_TOOLS,
  TOOL_REGISTRY,
  createAdapter,
  getAgent,
  getToolsForAgent,
  normalizeEvent,
};
