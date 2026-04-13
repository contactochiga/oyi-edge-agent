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
    whatsapp_phone: normalizePhone(input.whatsapp_phone),
    primary_channel: normalizeText(input.primary_channel),
    source: normalizeSource(input.source, fallbackSource),
    location: normalizeText(input.location),
    unit_count:
      input.unit_count === undefined || input.unit_count === null || input.unit_count === ""
        ? undefined
        : Math.max(0, Math.round(Number(input.unit_count) || 0)),
    project_type: normalizeText(input.project_type),
    status: normalizeText(input.status),
    owner: normalizeText(input.owner),
    commercial_stage: normalizeText(input.commercial_stage),
    lost_reason: normalizeText(input.lost_reason),
    score: normalizeScore(input.score),
    summary: normalizeText(input.summary),
    next_action: normalizeText(input.next_action),
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
