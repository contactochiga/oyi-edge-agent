require("dotenv").config();
require("dotenv").config({ path: ".env.lead-agents.local", override: true });
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { createConfig } = require("./config");
const { log } = require("./logger");
const { createStore } = require("./store-factory");
const { OpenAIResponsesClient } = require("./openai");
const { ToolExecutor } = require("./tools");
const { LeadAgentRuntime } = require("./runtime");
const { WebhookDispatcher } = require("./webhooks");
const {
  authorizePermission,
  clearSessionCookie,
  createAdminSessionToken,
  createSessionCookie,
  enforceAuth,
  hashPassword,
  permissionsForRole,
  readAdminSession,
  verifyPassword,
} = require("./auth");
const { MemoryRateLimiter } = require("./rate-limit");
const { FileKnowledgeBase } = require("./knowledge-base");
const { normalizeEmail, normalizeLeadInput, normalizeLeadPatch } = require("./normalize-lead");
const { WhatsAppCloudAdapter } = require("./whatsapp");
const { buildCalendarLinks, parsePreferredSchedule } = require("./scheduling");
const { buildProposal, inferCommercialFacts } = require("./commercial");
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

function generateOpaqueToken() {
  return crypto.randomBytes(24).toString("hex");
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function absoluteUrl(req, pathname, token) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const base = `${proto}://${host}${pathname}`;
  if (!token) return base;
  return `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

async function buildChannelOverview(store, config) {
  const [leads, notifications] = await Promise.all([
    store.listLeads ? store.listLeads() : [],
    store.listNotifications ? store.listNotifications(500) : [],
  ]);

  function leadCount(match) {
    return leads.filter(match).length;
  }

  function notificationCount(channel) {
    return notifications.filter((notification) => {
      return (
        notification.type === "inbound_message" &&
        (notification.status || "open") === "open" &&
        String(notification.channel || notification.metadata?.source || "")
          .toLowerCase()
          .includes(channel)
      );
    }).length;
  }

  const whatsappReady = Boolean(
    config.whatsappVerifyToken &&
      config.whatsappAccessToken &&
      config.whatsappPhoneNumberId &&
      config.whatsappBusinessAccountId
  );

  return {
    channels: [
      {
        key: "website",
        name: "Website Widget",
        status: "active",
        lead_count: leadCount((lead) =>
          ["website", "website_chat", "website_widget"].includes(
            String(lead.primary_channel || lead.source || "").toLowerCase()
          )
        ),
        open_notifications: notificationCount("website"),
        description: "Live widget intake on Ochiga and Oyi websites.",
        note: "Inbound widget chats create lead records, notifications, and live conversation threads.",
      },
      {
        key: "whatsapp",
        name: "WhatsApp Business",
        status: whatsappReady ? "active" : "needs_config",
        lead_count: leadCount(
          (lead) =>
            String(lead.primary_channel || "").toLowerCase() === "whatsapp" ||
            Boolean(lead.whatsapp_phone)
        ),
        open_notifications: notificationCount("whatsapp"),
        description: "Meta webhook intake, reply orchestration, and human takeover controls.",
        note: whatsappReady
          ? "Webhook and outbound credentials are configured. New inbound messages should notify and open the thread directly."
          : "Webhook or outbound credentials are incomplete. Finish Meta configuration before go-live.",
      },
      {
        key: "facebook",
        name: "Facebook Messenger",
        status: "staged",
        lead_count: leadCount(
          (lead) =>
            String(lead.primary_channel || lead.source || "").toLowerCase() === "facebook"
        ),
        open_notifications: notificationCount("facebook"),
        description: "Reserved pipeline area for Messenger direct message intake.",
        note: "UI and CRM staging are ready. Adapter and webhook activation are still pending.",
      },
      {
        key: "instagram",
        name: "Instagram DM",
        status: "staged",
        lead_count: leadCount(
          (lead) =>
            String(lead.primary_channel || lead.source || "").toLowerCase() === "instagram"
        ),
        open_notifications: notificationCount("instagram"),
        description: "Reserved pipeline area for Instagram DM intake.",
        note: "UI and CRM staging are ready. Adapter and webhook activation are still pending.",
      },
    ],
  };
}

async function appendAudit(store, authContext, action, targetType, targetId, metadata) {
  if (!store.appendAuditEvent) return null;
  return store.appendAuditEvent({
    actor_user_id: authContext?.userId || null,
    actor_email: authContext?.email || "",
    actor_role: authContext?.role || "",
    action,
    target_type: targetType,
    target_id: targetId || "",
    metadata: metadata || {},
  });
}

function extractPublicLeadPatch(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const patch = {};
  const inferred = inferCommercialFacts(text);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    patch.email = emailMatch[0];
  }

  const phoneMatch = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  if (phoneMatch) {
    patch.phone = phoneMatch[0];
  }

  const locationPatterns = [
    /location\s+(?:is\s+)?(?:at|in)\s+([a-z0-9&,\- ]{4,})/i,
    /project\s+(?:is\s+)?(?:at|in)\s+([a-z0-9&,\- ]{4,})/i,
    /(?:at|in)\s+([a-z0-9&,\- ]{4,})/i,
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      patch.location = match[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  const unitMatch = lower.match(/(\d{1,5})\s+units?/);
  const bedroomMatch = lower.match(/(\d(?:\s*&\s*\d)?)\s*bed/);
  const fragments = [];
  if (unitMatch) {
    fragments.push(`${unitMatch[1]} units`);
  }
  if (bedroomMatch) {
    fragments.push(`${bedroomMatch[1]} bedroom mix`);
  }
  if (patch.location) {
    fragments.push(`location ${patch.location}`);
  }

  if (fragments.length) {
    patch.summary = `Fallback project signals: ${fragments.join(", ")}.`;
  }
  if (inferred.unit_count) patch.unit_count = inferred.unit_count;
  if (inferred.project_type) patch.project_type = inferred.project_type;

  return patch;
}

async function ensurePublicFallbackLead(store, body) {
  const existing =
    body.lead_id && typeof body.lead_id === "string"
      ? await store.getLead(body.lead_id)
      : null;
  const patch = extractPublicLeadPatch(body.message);

  const existingByEmail =
    !existing && body.profile?.email && store.findLeadByEmail
      ? await store.findLeadByEmail(body.profile.email)
      : null;
  const existingByPhone =
    !existing && !existingByEmail && body.profile?.phone && store.findLeadByPhone
      ? await store.findLeadByPhone(body.profile.phone)
      : null;
  const matchedLead = existing || existingByEmail || existingByPhone;

  if (matchedLead) {
    return store.updateLead(matchedLead.id, {
      ...body.profile,
      ...patch,
      source: body.source || matchedLead.source || "website_chat",
    });
  }

  return store.createLead(
    normalizeLeadInput(
      {
        ...body.profile,
        ...patch,
        source: body.source || "website_chat",
        owner: "marketing_agent",
        status: "new",
        primary_channel: "website",
        summary:
          patch.summary || "Lead captured through public fallback response path.",
      },
      body.source || "website_chat"
    )
  );
}

function publicFallbackReply(message, lead) {
  const text = String(message || "").toLowerCase();
  const asksAboutCompany =
    text.includes("what do you do") ||
    text.includes("what does ochiga do") ||
    text.includes("brief") ||
    text.includes("company does") ||
    text.includes("tell me about") ||
    text.includes("what is oyi");

  if (asksAboutCompany) {
    return [
      "Hi, I'm Oma.",
      "Ochiga builds infrastructure technology for estates, buildings, and connected communities.",
      "Oyi is Ochiga's operating system for estate operations, access workflows, monitoring, resident services, and facility coordination.",
      "If you're working on a live project, share the location, number of units or buildings, and what you need most right now, and I'll guide the next step.",
    ].join(" ");
  }

  const location = lead && lead.location ? lead.location : "";
  const summary = lead && lead.summary ? lead.summary.toLowerCase() : "";
  const hasScale = /\b\d+\s+units?\b/i.test(summary);
  const hasContact = Boolean((lead && lead.email) || (lead && lead.phone));

  if (location || hasScale) {
    return [
      "Thanks.",
      `${location ? `I noted the project location as ${location}.` : "I noted the project scale details."}`,
      "What do you need most right now: access control, monitoring, resident services, facility operations, or a broader estate operating system?",
      hasContact
        ? "Once I have that, I can route the next step properly."
        : "If useful, you can also share the best contact email or phone for follow-up.",
    ].join(" ");
  }

  return [
    "Hi, I'm Oma.",
    "I can help with Ochiga and Oyi for estates, buildings, access workflows, monitoring, resident experience, and facility operations.",
    "Tell me your project location, approximate scale, and what you need most right now, and I'll point you correctly.",
  ].join(" ");
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
    notify_inbound: true,
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

async function enrichAuthContext(authContext, store) {
  if (!authContext || authContext.type !== "session") {
    return authContext;
  }
  const user = await store.getAdminUserByEmail(authContext.email);
  if (!user || user.status !== "active") {
    const error = new Error("unauthorized");
    error.statusCode = 401;
    throw error;
  }
  return {
    ...authContext,
    user,
    role: user.role || authContext.role,
    permissions: permissionsForRole(user.role || authContext.role),
  };
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
        authContext = await enrichAuthContext(authContext, store);
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

        if (adminUser && adminUser.status !== "active") {
          json(res, 403, { error: "account_inactive" });
          return;
        }
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
            last_login_at: new Date().toISOString(),
          }));
        await store.updateAdminUser(sessionUser.id, {
          last_login_at: new Date().toISOString(),
        });
        await appendAudit(
          store,
          {
            userId: sessionUser.id,
            email: sessionUser.email,
            role: sessionUser.role,
          },
          "session_login",
          "admin_user",
          sessionUser.id,
          {}
        );
        const token = createAdminSessionToken(sessionUser, config);
        json(
          res,
          200,
          {
            ok: true,
            admin: {
              id: sessionUser.id,
              email: sessionUser.email,
              role: sessionUser.role,
              display_name: sessionUser.display_name || sessionUser.email,
              status: sessionUser.status || "active",
              permissions: permissionsForRole(sessionUser.role),
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
        await appendAudit(store, authContext, "session_logout", "session", authContext?.userId || "", {});
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
        const currentUser = await store.getAdminUserByEmail(session.email);
        if (!currentUser || currentUser.status !== "active") {
          json(res, 401, { error: "unauthorized" }, { "x-request-id": ctx.requestId });
          return;
        }
        json(
          res,
          200,
          {
            ok: true,
            admin: {
              id: currentUser.id,
              email: currentUser.email,
              role: currentUser.role,
              display_name: currentUser.display_name || currentUser.email,
              status: currentUser.status || "active",
              permissions: permissionsForRole(currentUser.role),
            },
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/session/password") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        authorizePermission(authContext, "change_password");
        const body = await readJsonBody(req);
        requireObject(body, "body");
        if (!body.current_password || !body.new_password) {
          json(res, 400, { error: "current_password and new_password are required" });
          return;
        }
        const currentUser = await store.getAdminUserByEmail(authContext.email);
        if (!currentUser || !verifyPassword(body.current_password, currentUser.password_hash)) {
          json(res, 401, { error: "unauthorized" });
          return;
        }
        const updated = await store.updateAdminUser(currentUser.id, {
          password_hash: hashPassword(body.new_password),
          password_changed_at: new Date().toISOString(),
        });
        await appendAudit(store, authContext, "password_changed", "admin_user", currentUser.id, {});
        json(res, 200, { ok: true, user: updated }, { "x-request-id": ctx.requestId });
        return;
      }

      if (pathname === "/api/lead-agents/admin/session/invite/accept") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        const body = await readJsonBody(req);
        requireObject(body, "body");
        if (!body.token || !body.password) {
          json(res, 400, { error: "token and password are required" });
          return;
        }
        const invite = await store.getAdminInviteByTokenHash(hashOpaqueToken(body.token));
        if (!invite || invite.status !== "pending" || new Date(invite.expires_at).getTime() < Date.now()) {
          json(res, 400, { error: "invalid_or_expired_invite" });
          return;
        }
        const user = await store.ensureAdminUser({
          email: invite.email,
          password_hash: hashPassword(body.password),
          role: invite.role || "viewer",
          display_name: body.display_name || invite.display_name || invite.email,
          status: "active",
          password_changed_at: new Date().toISOString(),
        });
        await store.updateAdminInvite(invite.id, {
          status: "accepted",
          accepted_at: new Date().toISOString(),
        });
        await appendAudit(
          store,
          { userId: user.id, email: user.email, role: user.role },
          "invite_accepted",
          "admin_invite",
          invite.id,
          { email: invite.email }
        );
        const token = createAdminSessionToken(user, config);
        json(
          res,
          200,
          {
            ok: true,
            admin: {
              id: user.id,
              email: user.email,
              role: user.role,
              display_name: user.display_name || user.email,
              status: user.status || "active",
              permissions: permissionsForRole(user.role),
            },
          },
          {
            "set-cookie": createSessionCookie(token, config),
            "x-request-id": ctx.requestId,
          }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/session/reset/confirm") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        const body = await readJsonBody(req);
        requireObject(body, "body");
        if (!body.token || !body.new_password) {
          json(res, 400, { error: "token and new_password are required" });
          return;
        }
        const reset = await store.getPasswordResetTokenByHash(hashOpaqueToken(body.token));
        if (!reset || reset.status !== "pending" || new Date(reset.expires_at).getTime() < Date.now()) {
          json(res, 400, { error: "invalid_or_expired_reset" });
          return;
        }
        const user = await store.getAdminUserByEmail(reset.email);
        if (!user) {
          json(res, 404, { error: "user_not_found" });
          return;
        }
        await store.updateAdminUser(user.id, {
          password_hash: hashPassword(body.new_password),
          password_changed_at: new Date().toISOString(),
        });
        await store.updatePasswordResetToken(reset.id, {
          status: "used",
          used_at: new Date().toISOString(),
        });
        await appendAudit(
          store,
          { userId: user.id, email: user.email, role: user.role },
          "password_reset_completed",
          "admin_user",
          user.id,
          {}
        );
        json(res, 200, { ok: true }, { "x-request-id": ctx.requestId });
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

        let result;
        try {
          result = await runtime.runChat({
            agent: "marketing",
            lead_id: body.lead_id,
            source: body.source || config.defaultLeadSource,
            notify_inbound: true,
            message: body.message,
            profile: body.profile || {},
          });
        } catch (err) {
          log("error", "lead_agents_server.public_chat_fallback", {
            request_id: ctx.requestId,
            error: err?.stack || err?.message || String(err),
          });
          const fallbackLead = await ensurePublicFallbackLead(store, body);
          const fallbackAssistant = publicFallbackReply(body.message, fallbackLead);
          await store.appendConversation({
            lead_id: fallbackLead.id,
            agent_name: "marketing_agent",
            message_role: "user",
            channel: "website",
            content: body.message,
          });
          await store.appendConversation({
            lead_id: fallbackLead.id,
            agent_name: "marketing_agent",
            message_role: "assistant",
            channel: "website",
            content: fallbackAssistant,
          });
          result = {
            agent: "marketing_agent",
            lead: fallbackLead,
            trace_id: "",
            lead_memory: null,
            knowledge_hits: [],
            assistant_message: fallbackAssistant,
            tools: [],
            conversations: await store.listConversationsForLead(
              fallbackLead.id,
              config.maxConversationMessages
            ),
            degraded: true,
          };
        }

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
        authorizePermission(authContext, "manage_leads");
        const body = await readJsonBody(req);
        if (!body.message || typeof body.message !== "string") {
          json(res, 400, { error: "message is required" });
          return;
        }

        const result = await runtime.runChat({
          agent: body.agent,
          lead_id: body.lead_id,
          source: body.source,
          notify_inbound: false,
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
        authorizePermission(authContext, "manage_leads");
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
        authorizePermission(authContext, "view_dashboard");
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
        authorizePermission(authContext, "view_dashboard");
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
        authorizePermission(authContext, "view_dashboard");
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
          authorizePermission(authContext, "view_dashboard");
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
          authorizePermission(authContext, "manage_takeover");
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
          authorizePermission(authContext, "view_dashboard");
          const lead = await store.getLead(leadMatch[1]);
          if (!lead) {
            notFound(res);
            return;
          }
          json(res, 200, { lead }, { "x-request-id": ctx.requestId });
          return;
        }
        if (req.method === "PATCH") {
          authorizePermission(authContext, "manage_leads");
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
              unit_count: body.unit_count,
              project_type: body.project_type,
              status: body.status,
              owner: body.owner,
              commercial_stage: body.commercial_stage,
              lost_reason: body.lost_reason,
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
        authorizePermission(authContext, "view_dashboard");
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

      const proposalMatch = pathname.match(/^\/api\/lead-agents\/leads\/([^/]+)\/proposals$/);
      if (proposalMatch) {
        const leadId = proposalMatch[1];
        if (req.method === "GET") {
          authorizePermission(authContext, "view_dashboard");
          json(
            res,
            200,
            { proposals: await store.listProposalsForLead(leadId) },
            { "x-request-id": ctx.requestId }
          );
          return;
        }
        if (req.method === "POST") {
          authorizePermission(authContext, "manage_commercial");
          const lead = await store.getLead(leadId);
          if (!lead) {
            notFound(res);
            return;
          }
          const body = await readJsonBody(req);
          requireObject(body, "body");
          const inferred = inferCommercialFacts([lead.summary, lead.next_action, body.context || ""].join(" "));
          const unitCount = body.unit_count || lead.unit_count || inferred.unit_count;
          const projectType = body.project_type || lead.project_type || inferred.project_type;
          if (!unitCount) {
            json(res, 400, { error: "unit_count_required" });
            return;
          }
          const proposalPayload = buildProposal({
            unitCount,
            projectType,
            leadName: lead.name,
            company: lead.company,
          });
          const proposal = await store.createProposal({
            lead_id: leadId,
            ...proposalPayload,
            status: body.status || "draft",
            actor: authContext?.email || "system",
          });
          const proposalStatus = String(body.status || "draft").toLowerCase();
          const updatedLead = await store.updateLead(leadId, {
            unit_count: unitCount,
            project_type: projectType,
            commercial_stage:
              proposalStatus === "accepted"
                ? "won"
                : proposalStatus === "declined"
                ? "lost"
                : proposalStatus === "sent"
                ? "proposal"
                : lead.commercial_stage || "proposal",
            status: proposalStatus === "accepted" ? "closed" : proposalStatus === "declined" ? "lost" : undefined,
            lost_reason: proposalStatus === "declined" ? "proposal_declined" : undefined,
            next_action:
              proposalStatus === "accepted"
                ? "Prepare deployment plan"
                : proposalStatus === "declined"
                ? "Record loss and nurture if needed"
                : "Review and send proposal",
          });
          await appendAudit(store, authContext, "proposal_created", "proposal", proposal.id, {
            lead_id: leadId,
            tier_name: proposal.tier_name,
            status: proposal.status,
          });
          json(res, 201, { proposal, lead: updatedLead }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,POST");
        return;
      }

      const demosMatch = pathname.match(/^\/api\/lead-agents\/leads\/([^/]+)\/demos$/);
      if (demosMatch) {
        if (req.method === "GET") {
          authorizePermission(authContext, "view_dashboard");
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
          authorizePermission(authContext, "manage_demos");
          const body = await readJsonBody(req);
          requireObject(body, "body");
          const lead = await store.getLead(demosMatch[1]);
          if (!lead) {
            notFound(res);
            return;
          }
          const schedule = parsePreferredSchedule({
            text: body.scheduled_for || "",
            timezoneHint: body.timezone || "",
          });
          const calendarLinks = buildCalendarLinks({
            title: "Ochiga Discovery Demo",
            description: `Lead ${lead.name || ""} ${lead.company ? `(${lead.company})` : ""}`.trim(),
            location: lead.location || "",
            startIso: schedule.scheduled_for,
            timezone: schedule.timezone,
          });
          const demo = await store.createDemo({
            lead_id: demosMatch[1],
            scheduled_for: schedule.scheduled_for,
            status: body.status || (schedule.scheduled_for ? "confirmed" : "pending"),
            notes: JSON.stringify({
              notes: body.notes || "",
              timezone: schedule.timezone || body.timezone || "",
              preferred_time_text: body.scheduled_for || "",
              display_time: schedule.display_text || "",
              calendar_links: calendarLinks,
            }),
          });
          if (parseBoolean(body.update_lead_status, true)) {
            await store.updateLead(demosMatch[1], {
              status: "booked",
              owner: "sales_agent",
              next_action: schedule.scheduled_for
                ? `Confirmed demo for ${schedule.display_text}`
                : "Confirm scheduled demo",
            });
          }
          json(res, 201, { demo }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,POST");
        return;
      }

      if (pathname === "/api/lead-agents/admin/demos") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        authorizePermission(authContext, "view_reports");
        json(
          res,
          200,
          { demos: await store.listDemos() },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/proposals") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        authorizePermission(authContext, "view_reports");
        json(
          res,
          200,
          { proposals: await store.listProposals() },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      const proposalAdminMatch = pathname.match(/^\/api\/lead-agents\/admin\/proposals\/([^/]+)$/);
      if (proposalAdminMatch) {
        if (req.method !== "PATCH") {
          methodNotAllowed(res, "PATCH");
          return;
        }
        authorizePermission(authContext, "manage_commercial");
        const proposal = await store.getProposal(proposalAdminMatch[1]);
        if (!proposal) {
          notFound(res);
          return;
        }
        const body = await readJsonBody(req);
        requireObject(body, "body");
        const updatedProposal = await store.updateProposal(proposal.id, {
          status: body.status || proposal.status,
          body: body.body || proposal.body,
          metadata: body.metadata || proposal.metadata,
        });
        const proposalStatus = String(updatedProposal.status || "").toLowerCase();
        const leadPatch = {
          commercial_stage:
            proposalStatus === "accepted"
              ? "won"
              : proposalStatus === "declined"
              ? "lost"
              : proposalStatus === "sent"
              ? "proposal"
              : "proposal",
          status: proposalStatus === "accepted" ? "closed" : proposalStatus === "declined" ? "lost" : undefined,
          lost_reason: proposalStatus === "declined" ? "proposal_declined" : undefined,
          next_action:
            proposalStatus === "accepted"
              ? "Prepare deployment plan"
              : proposalStatus === "declined"
              ? "Record loss and nurture if needed"
              : proposalStatus === "sent"
              ? "Await proposal feedback"
              : "Review proposal",
        };
        const updatedLead = await store.updateLead(proposal.lead_id, leadPatch);
        await appendAudit(store, authContext, "proposal_updated", "proposal", proposal.id, {
          status: updatedProposal.status,
          lead_id: proposal.lead_id,
        });
        json(
          res,
          200,
          { proposal: updatedProposal, lead: updatedLead },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/notify-founder") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        authorizePermission(authContext, "escalate_founder");
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
        authorizePermission(authContext, "view_traces");
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
        authorizePermission(authContext, "manage_notifications");
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

      const notificationMatch = pathname.match(
        /^\/api\/lead-agents\/admin\/notifications\/([^/]+)$/
      );
      if (notificationMatch) {
        if (req.method !== "PATCH") {
          methodNotAllowed(res, "PATCH");
          return;
        }
        authorizePermission(authContext, "manage_notifications");
        const body = await readJsonBody(req);
        requireObject(body, "body");
        const notification = await store.updateNotification(notificationMatch[1], {
          status: body.status,
          delivered:
            body.delivered === undefined ? undefined : parseBoolean(body.delivered, false),
          response_code: body.response_code,
          metadata: body.metadata,
          summary: body.summary,
        });
        if (!notification) {
          notFound(res);
          return;
        }
        json(
          res,
          200,
          {
            notification,
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
        authorizePermission(authContext, "view_reports");
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

      if (pathname === "/api/lead-agents/admin/channels") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        authorizePermission(authContext, "view_reports");
        json(
          res,
          200,
          await buildChannelOverview(store, config),
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/audit") {
        if (req.method !== "GET") {
          methodNotAllowed(res, "GET");
          return;
        }
        authorizePermission(authContext, "view_audit");
        json(
          res,
          200,
          { audit: await store.listAuditEvents(200) },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      if (pathname === "/api/lead-agents/admin/users") {
        if (req.method === "GET") {
          authorizePermission(authContext, "view_users");
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
          authorizePermission(authContext, "manage_users");
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
          await appendAudit(store, authContext, "admin_user_created", "admin_user", user.id, {
            email: user.email,
            role: user.role,
          });
          json(res, 201, { user }, { "x-request-id": ctx.requestId });
          return;
        }
        methodNotAllowed(res, "GET,POST");
        return;
      }

      if (pathname === "/api/lead-agents/admin/users/invite") {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        authorizePermission(authContext, "manage_security");
        const body = await readJsonBody(req);
        requireObject(body, "body");
        if (!body.email) {
          json(res, 400, { error: "email is required" });
          return;
        }
        const rawToken = generateOpaqueToken();
        const invite = await store.createAdminInvite({
          email: body.email,
          role: body.role || "viewer",
          display_name: body.display_name || "",
          token_hash: hashOpaqueToken(rawToken),
          status: "pending",
          invited_by: authContext?.email || "",
          expires_at: new Date(Date.now() + (Number(body.expires_in_hours || 72) * 60 * 60 * 1000)).toISOString(),
        });
        await appendAudit(store, authContext, "admin_invite_created", "admin_invite", invite.id, {
          email: invite.email,
          role: invite.role,
        });
        json(
          res,
          201,
          {
            invite,
            invite_token: rawToken,
            invite_url: absoluteUrl(req, "/dashboard?mode=invite", rawToken),
          },
          { "x-request-id": ctx.requestId }
        );
        return;
      }

      const adminUserMatch = pathname.match(/^\/api\/lead-agents\/admin\/users\/([^/]+)$/);
      if (adminUserMatch) {
        if (req.method !== "PATCH") {
          methodNotAllowed(res, "PATCH");
          return;
        }
        authorizePermission(authContext, "manage_users");
        const body = await readJsonBody(req);
        requireObject(body, "body");
        const patch = {};
        if (body.display_name !== undefined) patch.display_name = body.display_name;
        if (body.role !== undefined) patch.role = body.role;
        if (body.status !== undefined) patch.status = body.status;
        if (body.password) {
          patch.password_hash = hashPassword(body.password);
          patch.password_changed_at = new Date().toISOString();
        }
        const user = await store.updateAdminUser(adminUserMatch[1], patch);
        if (!user) {
          notFound(res);
          return;
        }
        await appendAudit(store, authContext, "admin_user_updated", "admin_user", user.id, patch);
        json(res, 200, { user }, { "x-request-id": ctx.requestId });
        return;
      }

      const adminUserResetMatch = pathname.match(/^\/api\/lead-agents\/admin\/users\/([^/]+)\/reset$/);
      if (adminUserResetMatch) {
        if (req.method !== "POST") {
          methodNotAllowed(res, "POST");
          return;
        }
        authorizePermission(authContext, "manage_security");
        const user = await store.getAdminUserById(adminUserResetMatch[1]);
        if (!user) {
          notFound(res);
          return;
        }
        const body = await readJsonBody(req);
        const rawToken = generateOpaqueToken();
        const reset = await store.createPasswordResetToken({
          admin_user_id: user.id,
          email: user.email,
          token_hash: hashOpaqueToken(rawToken),
          requested_by: authContext?.email || "",
          expires_at: new Date(Date.now() + (Number(body?.expires_in_hours || 24) * 60 * 60 * 1000)).toISOString(),
        });
        await appendAudit(store, authContext, "password_reset_issued", "admin_user", user.id, {
          email: user.email,
          reset_id: reset.id,
        });
        json(
          res,
          201,
          {
            reset,
            reset_token: rawToken,
            reset_url: absoluteUrl(req, "/dashboard?mode=reset", rawToken),
          },
          { "x-request-id": ctx.requestId }
        );
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
