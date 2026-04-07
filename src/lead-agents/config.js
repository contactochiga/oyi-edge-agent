const path = require("path");

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringListFromEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createConfig() {
  const cwd = process.cwd();

  return {
    port: numberFromEnv(process.env.LEAD_AGENTS_PORT, 8787),
    host: process.env.LEAD_AGENTS_HOST || "0.0.0.0",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    openaiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
    requestTimeoutMs: numberFromEnv(process.env.LEAD_AGENTS_REQUEST_TIMEOUT_MS, 120000),
    maxToolRounds: numberFromEnv(process.env.LEAD_AGENTS_MAX_TOOL_ROUNDS, 8),
    maxConversationMessages: numberFromEnv(
      process.env.LEAD_AGENTS_MAX_CONVERSATION_MESSAGES,
      24
    ),
    storePath:
      process.env.LEAD_AGENTS_STORE_PATH ||
      path.join(cwd, "data", "lead-agents-store.json"),
    founderWebhookUrl: process.env.FOUNDER_ALERT_WEBHOOK_URL || "",
    founderWebhookSecret: process.env.FOUNDER_ALERT_WEBHOOK_SECRET || "",
    demoWebhookUrl: process.env.DEMO_WEBHOOK_URL || "",
    demoWebhookSecret: process.env.DEMO_WEBHOOK_SECRET || "",
    allowedOrigins: stringListFromEnv(process.env.LEAD_AGENTS_ALLOWED_ORIGINS),
    defaultLeadSource: process.env.LEAD_AGENTS_DEFAULT_SOURCE || "website_chat",
    environment: process.env.NODE_ENV || "development",
    toolsPath: path.join(cwd, "config", "openai", "lead-agent-tools.json"),
    promptPackRoot: path.join(cwd, "prompt-packs"),
    storeDriver: process.env.LEAD_AGENTS_STORE_DRIVER || "file",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    authMode: process.env.LEAD_AGENTS_AUTH_MODE || "optional_api_key",
    apiKeys: stringListFromEnv(process.env.LEAD_AGENTS_API_KEYS),
    rateLimitWindowMs: numberFromEnv(
      process.env.LEAD_AGENTS_RATE_LIMIT_WINDOW_MS,
      60_000
    ),
    rateLimitMaxRequests: numberFromEnv(
      process.env.LEAD_AGENTS_RATE_LIMIT_MAX_REQUESTS,
      60
    ),
  };
}

module.exports = {
  createConfig,
};
