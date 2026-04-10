require("dotenv").config();
require("dotenv").config({ path: ".env.lead-agents.local", override: true });
const http = require("http");
const path = require("path");
const { createConfig } = require("./config");
const { log } = require("./logger");
const { createStore } = require("./store-factory");
const { OpenAIResponsesClient } = require("./openai");
const { ToolExecutor } = require("./tools");
const { LeadAgentRuntime } = require("./runtime");
const { WebhookDispatcher } = require("./webhooks");
const {
  authorizeRole,
  clearSessionCookie,
  createAdminSessionToken,
  createSessionCookie,
  enforceAuth,
  hashPassword,
  readAdminSession,
  verifyPassword,
} = require("./auth");
const { MemoryRateLimiter } = require("./rate-limit");
const { FileKnowledgeBase } = require("./knowledge-base");
const { normalizeEmail, normalizeLeadInput, normalizeLeadPatch } = require("./normalize-lead");
const { WhatsAppCloudAdapter } = require("./whatsapp");
const {
  createRequestContext,
  getPathname,
  json,
  methodNotAllowed,
  notFound,
  readJsonBody,
  serveFile,
  setCorsHeaders,
} = require("./http");

function validateConfig(config) {
  if (!config.openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY for lead agents backend");
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

function requireObject(body, name) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error(`${name} must be an object`);
    error.statusCode = 400;
    throw error;
  }
}

function customerServiceWindowExpiry(timestampSeconds) {
  const baseMs = Number(timestampSeconds || 0) * 1000 || Date.now();
  return new Date(baseMs + 24 * 60 * 60 * 1000).toISOString();
}

async function resolveLeadForChannel(store, phone, source) {
  const existing = await store.findLeadByPhone(phone);
  if (existing) {
    return existing;
  }
  return store.createLead({
    phone,
    whatsapp_phone: phone,
    primary_channel: "whatsapp",
    channel_last_seen_at: new Date().toISOString(),
    source,
    owner: "marketing_agent",
    status: "new",
    summary: "Lead created from WhatsApp inbound message.",
  });
}

async function processWhatsAppEvent({ event, runtime, store, adapter, config, requestId }) {
  if (event.kind === "status") {
    await store.appendInboundEvent({
      channel: "whatsapp",
      provider: "meta",
      event_type: `status:${event.status}`,
      external_event_id: event.message_id,
      payload: event.raw,
    });
    return {
      kind: "status",
      message_id: event.message_id,
      status: event.status,
    };
  }

  const lead = await resolveLeadForChannel(store, event.from, "whatsapp");
  await store.updateLead(lead.id, {
    whatsapp_phone: event.from,
    primary_channel: "whatsapp",
    channel_last_seen_at: new Date().toISOString(),
  });
  await store.appendInboundEvent({
    channel: "whatsapp",
    provider: "meta",
    event_type: "message",
    lead_id: lead.id,
    external_event_id: event.message_id,
    payload: event.raw,
  });

  const channelState = await store.upsertLeadChannelState(lead.id, "whatsapp", {
    customer_service_window_expires_at: customerServiceWindowExpiry(event.timestamp),
    last_external_message_id: event.message_id,
    last_inbound_at: new Date(Number(event.timestamp || 0) * 1000 || Date.now()).toISOString(),
    human_status: "auto",
  });

  if (channelState.ai_paused || ["human_active", "human_review"].includes(channelState.human_status)) {
    return {
      kind: "message",
      lead_id: lead.id,
      paused: true,
    };
  }

  const result = await runtime.runChat({
    agent: lead.owner === "sales_agent" || lead.status === "sales" ? "sales" : "marketing",
    lead_id: lead.id,
    source: "whatsapp",
    channel: "whatsapp",
    message: event.text || "",
    external_message_id: event.message_id,
    profile: {
      phone: event.from,
    },
    request_id: requestId,
  });

  const sendResult = await adapter.sendTextMessage({
    to: event.from,
    body: result.assistant_message,
    contextMessageId: event.message_id,
  });

  await store.upsertLeadChannelState(lead.id, "whatsapp", {
    last_outbound_at: new Date().toISOString(),
    last_external_message_id: sendResult.external_message_id || event.message_id,
  });

  return {
    kind: "message",
    lead_id: lead.id,
    outbound: sendResult,
  };
}

async function bootstrapAdminUser(store, config) {
  if (!config.adminEmail || !config.adminPassword) {
    return null;
  }
  return store.ensureAdminUser({
    email: normalizeEmail(config.adminEmail),
    password_hash: hashPassword(config.adminPassword),
    role: config.adminRole || "admin",
    display_name: config.adminEmail,
    status: "active",
  });
}

function buildServer({ config, store, runtime, rateLimiter, whatsappAdapter }) {
  const startedAt = Date.now();
  const widgetIndexPath = path.join(process.cwd(), "public", "widget", "index.html");
  const widgetScriptPath = path.join(
    process.cwd(),
    "public",
    "widget",
    "oma-widget.js"
  );
  const dashboardIndexPath = path.join(
    process.cwd(),
    "public",
    "dashboard",
    "index.html"
  );
  const dashboardScriptPath = path.join(
    process.cwd(),
    "public",
    "dashboard",
    "dashboard.js"
  );
  const dashboardLogoPath = path.join(
    process.cwd(),
    "public",
    "assets",
    "ochiga-logo.png"
  );

  return http.createServer(async (req, res) => {
    const ctx = createRequestContext(req);
    const pathname = getPathname(req);
    const corsAccepted = setCorsHeaders(req, res, config.allowedOrigins);
    let authContext = null;

    if (req.method === "OPTIONS") {
      if (!corsAccepted && config.allowedOrigins.length > 0) {
        json(res, 403, { error: "origin_not_allowed" });
        return;
      }
      res.writeHead(204);
      res.end();
      return;
    }

    if (!corsAccepted && config.allowedOrigins.length > 0) {
      json(res, 403, { error: "origin_not_allowed" });
      return;
    }

    try {
      const isPublicWidgetPath =
        pathname === "/widget" ||
        pathname === "/widget/" ||
        pathname === "/widget.js" ||
        pathname === "/api/lead-agents/public/chat";
      const isPublicDashboardPath =
        pathname === "/dashboard" ||
        pathname === "/dashboard/" ||
        pathname === "/dashboard.js" ||
        pathname === "/assets/ochiga-logo.png";
      const isPublicAdminSessionPath =
        pathname === "/api/lead-agents/admin/session/login" ||
        pathname === "/api/lead-agents/admin/session/logout" ||
        pathname === "/api/lead-agents/admin/session/me";
      const isPublicWhatsappPath = pathname === "/webhooks/whatsapp";

      if (
        pathname !== "/healthz" &&
        !isPublicWidgetPath &&
        !isPublicDashboardPath &&
        !isPublicAdminSessionPath &&
        !isPublicWhatsappPath
      ) {
        authContext = enforceAuth(req, config);
        const rateLimitState = rateLimiter.check(req);
        res.setHeader("x-ratelimit-remaining", String(rateLimitState.remaining));
        res.setHeader(
          "x-ratelimit-reset",
          new Date(rateLimitState.resetAt).toISOString()
        );
      }

      if (pathname === "/healthz") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(res, 200, {
          ok: true,
          uptime_ms: Date.now() - startedAt,
          stats: await store.stats(),
          environment: config.environment,
          store_driver: config.storeDriver,
        });
        return;
      }

      if (pathname === "/webhooks/whatsapp") {
        if (req.method === "GET") {
          const url = new URL(req.url, "http://localhost");
          const challenge = whatsappAdapter.verifyWebhook(
            url.searchParams.get("hub.mode"),
            url.searchParams.get("hub.verify_token"),
            url.searchParams.get("hub.challenge")
          );
          if (!challenge) {
            json(res, 403, { error: "forbidden" });
            return;
          }
          res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
          res.end(String(challenge));
          return;
        }
        if (req.method === "POST") {
          const body = await readJsonBody(req);
          const events = whatsappAdapter.extractEvents(body);
          const results = [];
          for (const event of events) {
            results.push(
              await processWhatsAppEvent({
                event,
                runtime,
                store,
                adapter: whatsappAdapter,
                config,
                requestId: ctx.requestId,
              })
            );
          }
          json(res, 200, { ok: true, results }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,POST");
        return;
      }

      if (pathname === "/api/lead-agents/admin/session/login") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        const body = await readJsonBody(req);
        const adminUser = await store.getAdminUserByEmail(body.email);
        const fallbackAllowed =
          !adminUser &&
          normalizeEmail(body.email) &&
          config.apiKeys.includes(String(body.password || ""));

        if ((!adminUser || !verifyPassword(body.password, adminUser.password_hash)) && !fallbackAllowed) {
          json(res, 401, { error: "unauthorized" });
          return;
        }

        const sessionUser =
          adminUser ||
          (await store.ensureAdminUser({
            email: normalizeEmail(body.email),
            password_hash: hashPassword(body.password),
            role: config.adminRole || "admin",
            display_name: body.email,
            status: "active",
          }));
        const token = createAdminSessionToken(sessionUser, config);
        json(
          res,
          200,
          {
            ok: true,
            admin: {
              email: sessionUser.email,
              role: sessionUser.role,
            },
          },
          {
            "set-cookie": createSessionCookie(token, config),
            "x-request-id": ctx.requestId,
          }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/session/logout") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        json(
          res,
          200,
          { ok: true },
          {
            "set-cookie": clearSessionCookie(config),
            "x-request-id": ctx.requestId,
          }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/session/me") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        const session = readAdminSession(req, config);
        if (!session) {
          json(res, 401, { error: "unauthorized" }, { "x-request-id": ctx.requestId });
          return;
        }
        json(
          res,
          200,
          {
            ok: true,
            admin: {
              email: session.email,
              role: session.role,
            },
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        await serveFile(res, dashboardIndexPath);
        return;
      }

      if (pathname === "/dashboard.js") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        await serveFile(res, dashboardScriptPath);
        return;
      }

      if (pathname === "/assets/ochiga-logo.png") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        await serveFile(res, dashboardLogoPath);
        return;
      }

      if (pathname === "/widget" || pathname === "/widget/") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        await serveFile(res, widgetIndexPath);
        return;
      }

      if (pathname === "/widget.js") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        await serveFile(res, widgetScriptPath);
        return;
      }

      if (pathname === "/api/lead-agents/public/chat") {
        const rateLimitState = rateLimiter.check(req);
        res.setHeader("x-ratelimit-remaining", String(rateLimitState.remaining));
        res.setHeader(
          "x-ratelimit-reset",
          new Date(rateLimitState.resetAt).toISOString()
        );

        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }

        const body = await readJsonBody(req);
        if (!body.message || typeof body.message !== "string") {
          json(res, 400, { error: "message is required" });
          return;
        }

        const result = await runtime.runChat({
          agent: "marketing",
          lead_id: body.lead_id,
          source: body.source || config.defaultLeadSource,
          message: body.message,
          profile: body.profile || {},
        });

        json(res, 200, result, {
          "x-request-id": ctx.requestId,
        });
        return;
      }

      if (pathname === "/api/lead-agents/chat") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        const body = await readJsonBody(req);
        if (!body.message || typeof body.message !== "string") {
          json(res, 400, { error: "message is required" });
          return;
        }

        const result = await runtime.runChat({
          agent: body.agent,
          lead_id: body.lead_id,
          source: body.source,
          message: body.message,
          profile: body.profile || {},
        });

        json(res, 200, result, {
          "x-request-id": ctx.requestId,
        });
        return;
      }

      if (pathname === "/api/lead-agents/admin/leads") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        const body = await readJsonBody(req);
        requireObject(body, "body");
        if (!body.source || typeof body.source !== "string") {
          json(res, 400, { error: "source is required" });
          return;
        }

        const lead = await store.createLead(
          normalizeLeadInput(
            {
              ...body,
              status: body.status || "new",
              owner: body.owner || "marketing_agent",
            },
            body.source
          )
        );

        json(res, 201, { lead }, { "x-request-id": ctx.requestId });
        return;
      }

      if (pathname === "/api/lead-agents/leads") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(
          res,
          200,
          { leads: await store.listLeads() },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      const memoryMatch = pathname.match(/^\/api\/lead-agents\/leads\/([^/]+)\/memory$/);
      if (memoryMatch) {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        const memory = await store.getLeadMemory(memoryMatch[1]);
        json(res, 200, { memory }, { "x-request-id": ctx.requestId });
        return;
      }

      const timelineMatch = pathname.match(/^\/api\/lead-agents\/leads\/([^/]+)\/timeline$/);
      if (timelineMatch) {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(
          res,
          200,
          {
            timeline: await store.listTimelineForLead(timelineMatch[1]),
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      const channelStateMatch = pathname.match(
        /^\/api\/lead-agents\/leads\/([^/]+)\/channel-state\/([^/]+)$/
      );
      if (channelStateMatch) {
        const leadId = channelStateMatch[1];
        const channel = channelStateMatch[2];
        if (req.method === "GET") {
          json(
            res,
            200,
            {
              channel_state: await store.getLeadChannelState(leadId, channel),
            },
            { "x-request-id": ctx.requestId }
          );
          return;
        }
        if (req.method === "PATCH") {
          const body = await readJsonBody(req);
          requireObject(body, "body");
          const updated = await store.upsertLeadChannelState(leadId, channel, {
            ai_paused: body.ai_paused,
            human_owner: body.human_owner,
            human_status: body.human_status,
            takeover_started_at: body.takeover_started_at,
            takeover_reason: body.takeover_reason,
            resume_mode: body.resume_mode,
            customer_service_window_expires_at:
              body.customer_service_window_expires_at,
            last_external_message_id: body.last_external_message_id,
            last_inbound_at: body.last_inbound_at,
            last_outbound_at: body.last_outbound_at,
          });
          json(
            res,
            200,
            {
              channel_state: updated,
            },
            { "x-request-id": ctx.requestId }
          );
          return;
        }
        methodNotAllowed(res, "GET,PATCH");
        return;
      }

      const leadMatch = pathname.match(/^\/api\/lead-agents\/leads\/([^/]+)$/);
      if (leadMatch) {
        if (req.method === "GET") {
          const lead = await store.getLead(leadMatch[1]);
          if (!lead) {
            notFound(res);
            return;
          }
          json(res, 200, { lead }, { "x-request-id": ctx.requestId });
          return;
        }
        if (req.method === "PATCH") {
          const body = await readJsonBody(req);
          requireObject(body, "body");
          const updated = await store.updateLead(
            leadMatch[1],
            normalizeLeadPatch({
              name: body.name,
              company: body.company,
              role: body.role,
              email: body.email,
              phone: body.phone,
              source: body.source,
              location: body.location,
              status: body.status,
              owner: body.owner,
              score: body.score,
              summary: body.summary,
              next_action: body.next_action,
            })
          );
          if (!updated) {
            notFound(res);
            return;
          }
          json(res, 200, { lead: updated }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,PATCH");
        return;
      }

      const conversationMatch = pathname.match(
        /^\/api\/lead-agents\/leads\/([^/]+)\/conversations$/
      );
      if (conversationMatch) {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(
          res,
          200,
          {
            conversations: await store.listConversationsForLead(conversationMatch[1]),
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      const demosMatch = pathname.match(/^\/api\/lead-agents\/leads\/([^/]+)\/demos$/);
      if (demosMatch) {
        if (req.method === "GET") {
          json(
            res,
            200,
            {
              demos: await store.listDemosForLead(demosMatch[1]),
            },
            { "x-request-id": ctx.requestId }
          );
          return;
        }
        if (req.method === "POST") {
          const body = await readJsonBody(req);
          requireObject(body, "body");
          const lead = await store.getLead(demosMatch[1]);
          if (!lead) {
            notFound(res);
            return;
          }
          const demo = await store.createDemo({
            lead_id: demosMatch[1],
            scheduled_for: body.scheduled_for || null,
            status: body.status || "pending",
            notes: body.notes || "",
          });
          if (parseBoolean(body.update_lead_status, true)) {
            await store.updateLead(demosMatch[1], {
              status: "booked",
              owner: "sales_agent",
              next_action: "Confirm scheduled demo",
            });
          }
          json(res, 201, { demo }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,POST");
        return;
      }

      if (pathname === "/api/lead-agents/admin/notify-founder") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        authorizeRole(authContext, ["admin", "founder"]);
        const body = await readJsonBody(req);
        requireObject(body, "body");
        if (!body.reason || !body.summary) {
          json(res, 400, { error: "reason and summary are required" });
          return;
        }
        const result = await runtime.toolExecutor.execute(
          "notify_founder",
          {
            lead_id: body.lead_id,
            urgency: body.urgency,
            reason: body.reason,
            summary: body.summary,
          },
          {
            leadId: body.lead_id || null,
            source: "admin",
            agentName: "human",
          }
        );
        json(res, 200, result, { "x-request-id": ctx.requestId });
        return;
      }

      if (pathname === "/api/lead-agents/admin/traces") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(
          res,
          200,
          {
            traces: await store.listTraces(200, {
              lead_id: req.headers["x-lead-id"] || "",
            }),
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/notifications") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(
          res,
          200,
          {
            notifications: await store.listNotifications(200),
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/reports/summary") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        json(
          res,
          200,
          {
            report: await store.getReportingSummary(),
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/users") {
        if (req.method === "GET") {
          authorizeRole(authContext, ["admin", "founder"]);
          json(
            res,
            200,
            {
              users: await store.listAdminUsers(),
            },
            { "x-request-id": ctx.requestId }
          );
          return;
        }
        if (req.method === "POST") {
          authorizeRole(authContext, ["admin"]);
          const body = await readJsonBody(req);
          requireObject(body, "body");
          if (!body.email || !body.password) {
            json(res, 400, { error: "email and password are required" });
            return;
          }
          const user = await store.ensureAdminUser({
            email: normalizeEmail(body.email),
            password_hash: hashPassword(body.password),
            role: body.role || "viewer",
            display_name: body.display_name || body.email,
            status: body.status || "active",
          });
          json(res, 201, { user }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,POST");
        return;
      }

      notFound(res);
    } catch (err) {
      log("error", "lead_agents_server.request_failed", {
        request_id: ctx.requestId,
        method: req.method,
        pathname,
        error: err?.stack || err?.message || String(err),
        upstream_status: err?.response?.status,
        upstream_data: err?.response?.data,
      });

      json(
        res,
        err.statusCode || 500,
        {
          error: err.message || "internal_server_error",
          upstream_status: err?.response?.status,
          upstream_data: err?.response?.data,
          request_id: ctx.requestId,
        },
        { "x-request-id": ctx.requestId }
      );
    }
  });
}

async function start() {
  const config = createConfig();
  validateConfig(config);

  const store = createStore(config);
  await store.init();
  await bootstrapAdminUser(store, config);

  const openaiClient = new OpenAIResponsesClient(config);
  const webhooks = new WebhookDispatcher({ config });
  const knowledgeBase = new FileKnowledgeBase(config.knowledgeDir);
  await knowledgeBase.init();
  const whatsappAdapter = new WhatsAppCloudAdapter(config);
  const toolExecutor = new ToolExecutor({ store, config, log, webhooks });
  const runtime = new LeadAgentRuntime({
    config,
    store,
    openaiClient,
    toolExecutor,
    log,
    knowledgeBase,
  });
  const rateLimiter = new MemoryRateLimiter({
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMaxRequests,
  });

  const server = buildServer({ config, store, runtime, rateLimiter, whatsappAdapter });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  log("info", "lead_agents_server.started", {
    host: config.host,
    port: config.port,
    store_path: config.storePath,
    store_driver: config.storeDriver,
    model: config.openaiModel,
  });

  const shutdown = () => {
    log("info", "lead_agents_server.stopping");
    server.close(() => {
      log("info", "lead_agents_server.stopped");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

module.exports = {
  start,
};
