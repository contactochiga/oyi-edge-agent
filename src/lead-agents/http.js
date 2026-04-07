const { URL } = require("url");
const crypto = require("crypto");

function json(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  json(res, 404, { error: "not_found" });
}

function methodNotAllowed(res, allow) {
  json(
    res,
    405,
    { error: "method_not_allowed" },
    {
      allow,
    }
  );
}

function setCorsHeaders(req, res, allowedOrigins) {
  const requestOrigin = req.headers.origin;
  const allowAll = allowedOrigins.length === 0;
  const allowOrigin = allowAll
    ? requestOrigin || "*"
    : allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : "";

  if (!allowOrigin) {
    return false;
  }

  res.setHeader("access-control-allow-origin", allowOrigin);
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-request-id");
  return true;
}

function createRequestContext(req) {
  return {
    requestId: req.headers["x-request-id"] || crypto.randomUUID(),
    startedAtMs: Date.now(),
  };
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    err.statusCode = 400;
    err.message = "Invalid JSON body";
    throw err;
  }
}

function getPathname(req) {
  return new URL(req.url, "http://localhost").pathname;
}

module.exports = {
  createRequestContext,
  getPathname,
  json,
  methodNotAllowed,
  notFound,
  readJsonBody,
  setCorsHeaders,
};
