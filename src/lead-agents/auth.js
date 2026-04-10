const crypto = require("crypto");

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function parseCookies(headerValue) {
  return String(headerValue || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const eqIndex = item.indexOf("=");
      if (eqIndex === -1) {
        return acc;
      }
      const key = item.slice(0, eqIndex).trim();
      const value = item.slice(eqIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function sessionSignature(payload, secret) {
  return crypto.createHmac("sha256", String(secret || "")).update(payload).digest("hex");
}

function createAdminSessionToken(email, config) {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      exp: Date.now() + config.sessionTtlMs,
    })
  ).toString("base64url");
  const signature = sessionSignature(payload, config.sessionSecret);
  return `${payload}.${signature}`;
}

function readAdminSession(req, config) {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[config.sessionCookieName];
  if (!rawToken) {
    return null;
  }

  const [payload, signature] = String(rawToken).split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sessionSignature(payload, config.sessionSecret);
  if (!secureEqual(expected, signature)) {
    return null;
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!decoded || !decoded.email || !decoded.exp || decoded.exp < Date.now()) {
    return null;
  }

  return {
    email: decoded.email,
    expiresAt: decoded.exp,
  };
}

function createSessionCookie(token, config) {
  const maxAgeSeconds = Math.max(60, Math.floor(config.sessionTtlMs / 1000));
  const secureFlag = config.environment === "production" ? "; Secure" : "";
  return `${config.sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`;
}

function clearSessionCookie(config) {
  const secureFlag = config.environment === "production" ? "; Secure" : "";
  return `${config.sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
}

function getApiKey(req) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return String(req.headers["x-api-key"] || "").trim();
}

function authenticateAdminCredentials(email, password, config) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }
  if (!config.adminEmail || !config.adminPassword) {
    return config.apiKeys.some((candidate) => secureEqual(candidate, String(password || "")));
  }
  return (
    secureEqual(normalizedEmail, config.adminEmail.toLowerCase()) &&
    secureEqual(String(password || ""), config.adminPassword)
  );
}

function enforceAuth(req, config) {
  if (config.authMode === "off") {
    return;
  }

  const session = readAdminSession(req, config);
  if (session) {
    return {
      type: "session",
      email: session.email,
    };
  }

  const apiKey = getApiKey(req);
  if (config.authMode === "required_api_key") {
    const allowed = config.apiKeys.some((candidate) => secureEqual(candidate, apiKey));
    if (!allowed) {
      const error = new Error("unauthorized");
      error.statusCode = 401;
      throw error;
    }
    return {
      type: "api_key",
    };
  }

  if (config.authMode === "optional_api_key" && config.apiKeys.length > 0 && apiKey) {
    const allowed = config.apiKeys.some((candidate) => secureEqual(candidate, apiKey));
    if (!allowed) {
      const error = new Error("unauthorized");
      error.statusCode = 401;
      throw error;
    }
    return {
      type: "api_key",
    };
  }

  return null;
}

module.exports = {
  authenticateAdminCredentials,
  clearSessionCookie,
  createAdminSessionToken,
  createSessionCookie,
  enforceAuth,
  readAdminSession,
};
