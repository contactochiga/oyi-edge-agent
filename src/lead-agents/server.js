require("dotenv").config();
require("dotenv").config({ path: ".env.lead-agents.local", override: true });
const http = require("http");
const { createConfig } = require("./config");
const { log } = require("./logger");
const { createStore } = require("./store-factory");
const { OpenAIResponsesClient } = require("./openai");
const { ToolExecutor } = require("./tools");
const { LeadAgentRuntime } = require("./runtime");
const { WebhookDispatcher } = require("./webhooks");
const { enforceAuth } = require("./auth");
const { MemoryRateLimiter } = require("./rate-limit");
const {
  createRequestContext,
  getPathname,
  json,
  methodNotAllowed,
  notFound,
  readJsonBody,
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

function buildServer({ config, store, runtime, rateLimiter }) {
  const startedAt = Date.now();

  return http.createServer(async (req, res) => {
    const ctx = createRequestContext(req);
    const pathname = getPathname(req);
    const corsAccepted = setCorsHeaders(req, res, config.allowedOrigins);

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
      if (pathname !== "/healthz") {
        enforceAuth(req, config);
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

        const lead = await store.createLead({
          name: body.name,
          company: body.company,
          role: body.role,
          email: body.email,
          phone: body.phone,
          source: body.source,
          location: body.location,
          status: body.status || "new",
          owner: body.owner || "marketing_agent",
          score: body.score,
          summary: body.summary || "",
          next_action: body.next_action || "",
          notes: body.notes || "",
        });

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
          const updated = await store.updateLead(leadMatch[1], {
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
          });
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

  const openaiClient = new OpenAIResponsesClient(config);
  const webhooks = new WebhookDispatcher({ config });
  const toolExecutor = new ToolExecutor({ store, config, log, webhooks });
  const runtime = new LeadAgentRuntime({
    config,
    store,
    openaiClient,
    toolExecutor,
    log,
  });
  const rateLimiter = new MemoryRateLimiter({
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMaxRequests,
  });

  const server = buildServer({ config, store, runtime, rateLimiter });

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
