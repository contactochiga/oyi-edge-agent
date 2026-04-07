const crypto = require("crypto");

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function getApiKey(req) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return String(req.headers["x-api-key"] || "").trim();
}

function enforceAuth(req, config) {
  if (config.authMode === "off") {
    return;
  }

  const apiKey = getApiKey(req);
  if (config.authMode === "required_api_key") {
    const allowed = config.apiKeys.some((candidate) => secureEqual(candidate, apiKey));
    if (!allowed) {
      const error = new Error("unauthorized");
      error.statusCode = 401;
      throw error;
    }
    return;
  }

  if (config.authMode === "optional_api_key" && config.apiKeys.length > 0 && apiKey) {
    const allowed = config.apiKeys.some((candidate) => secureEqual(candidate, apiKey));
    if (!allowed) {
      const error = new Error("unauthorized");
      error.statusCode = 401;
      throw error;
    }
  }
}

module.exports = {
  enforceAuth,
};
