function normalizeText(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (["unknown", "n/a", "na", "none", "null", "undefined"].includes(text.toLowerCase())) {
    return "";
  }
  return text.replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return normalizeText(value).replace(/[^\d+\-() ]/g, "");
}

function normalizeScore(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeSource(value, fallback) {
  const normalized = normalizeText(value);
  return normalized || normalizeText(fallback);
}

function normalizeLeadInput(input, fallbackSource) {
  return {
    name: normalizeText(input.name),
    company: normalizeText(input.company),
    role: normalizeText(input.role),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    source: normalizeSource(input.source, fallbackSource),
    location: normalizeText(input.location),
    status: normalizeText(input.status),
    owner: normalizeText(input.owner),
    score: normalizeScore(input.score),
    summary: normalizeText(input.summary),
    next_action: normalizeText(input.next_action),
    notes: normalizeText(input.notes),
  };
}

function normalizeLeadPatch(patch) {
  const normalized = normalizeLeadInput(patch, "");
  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  );
}

module.exports = {
  normalizeEmail,
  normalizeLeadInput,
  normalizeLeadPatch,
  normalizePhone,
  normalizeScore,
  normalizeSource,
  normalizeText,
};
