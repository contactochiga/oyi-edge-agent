const { normalizeText } = require("./normalize-lead");

const OYI_PRICING = {
  tiers: [
    {
      name: "Oyi Core Deployment",
      min_units: 0,
      max_units: 150,
      price: 499000,
    },
    {
      name: "Oyi Operations Deployment",
      min_units: 151,
      max_units: 350,
      price: 1250000,
    },
    {
      name: "Oyi Infrastructure Deployment",
      min_units: 351,
      max_units: 1000,
      price: 2750000,
    },
    {
      name: "Oyi Enterprise Deployment",
      min_units: 1001,
      max_units: null,
      price: "custom",
    },
  ],
  trial: "1 month free (first 100 deployments)",
};

function formatNaira(value) {
  if (value === "custom") return "Custom";
  const amount = Number(value || 0);
  return `₦${amount.toLocaleString("en-NG")}`;
}

function extractUnitCount(text) {
  const value = String(text || "");
  const match = value.match(/(\d{1,5})\s*(unit|units|home|homes|building|buildings|apartment|apartments)/i);
  if (!match) return undefined;
  const units = Number(match[1]);
  return Number.isFinite(units) ? units : undefined;
}

function extractProjectType(text) {
  const value = String(text || "").toLowerCase();
  const pairs = [
    ["mixed-use estate", ["mixed use", "mixed-use"]],
    ["estate", ["estate", "gated community"]],
    ["building", ["building", "tower", "apartment"]],
    ["facility", ["facility", "facilities"]],
    ["residential estate", ["residential"]],
    ["commercial property", ["commercial"]],
    ["community", ["community", "district"]],
  ];
  for (const [label, keywords] of pairs) {
    if (keywords.some((keyword) => value.includes(keyword))) {
      return label;
    }
  }
  return "";
}

function inferCommercialFacts(input) {
  const text = String(input || "");
  return {
    unit_count: extractUnitCount(text),
    project_type: extractProjectType(text),
  };
}

function selectTier(unitCount) {
  const units = Number(unitCount || 0);
  return OYI_PRICING.tiers.find((tier) => {
    const minOk = units >= tier.min_units;
    const maxOk = tier.max_units === null ? true : units <= tier.max_units;
    return minOk && maxOk;
  }) || OYI_PRICING.tiers[OYI_PRICING.tiers.length - 1];
}

function buildProposal({ unitCount, projectType, leadName, company }) {
  const normalizedUnits = Number(unitCount || 0);
  const tier = selectTier(normalizedUnits);
  const coverageCap = tier.max_units === null ? "enterprise-scale estates and portfolios" : `${tier.max_units} units`;
  const price = tier.price === "custom" ? "Custom enterprise pricing" : formatNaira(tier.price);
  const foundersOffer =
    tier.price === "custom" ? "Subject to enterprise agreement." : "First month free under the current founders offer.";

  const body = [
    `Based on your estate size of ${normalizedUnits || "unknown"} units, here is the recommended deployment structure:`,
    "",
    "### Deployment Tier",
    tier.name,
    "",
    "### Coverage",
    "- Full estate operations system",
    "- Access control + visitor management",
    "- Utilities monitoring (power, water)",
    "- Maintenance workflows",
    "- Resident app + device control",
    "- AI assistant (commands, routing, insights)",
    "- Role-based access + audit logs",
    "",
    "### Commercials",
    `- Monthly Subscription: ${price}`,
    `- Coverage: up to ${coverageCap}`,
    "- Billing: monthly",
    `- Founders Offer: ${foundersOffer}`,
    "",
    "### Deployment Approach",
    "1. Estate mapping and system setup",
    "2. Infrastructure connection",
    "3. Go-live with core operations",
    "4. Expansion into automation and reporting",
    "",
    "Would you like us to structure a deployment plan around your estate setup?",
  ].join("\n");

  return {
    tier_name: tier.name,
    unit_count: normalizedUnits || null,
    monthly_price: tier.price === "custom" ? null : Number(tier.price),
    currency: "NGN",
    coverage_units: tier.max_units,
    project_type: normalizeText(projectType),
    title: `${tier.name} proposal${company ? ` for ${company}` : leadName ? ` for ${leadName}` : ""}`,
    body,
    metadata: {
      pricing: OYI_PRICING,
      founders_offer: OYI_PRICING.trial,
    },
  };
}

module.exports = {
  OYI_PRICING,
  buildProposal,
  extractProjectType,
  extractUnitCount,
  formatNaira,
  inferCommercialFacts,
  selectTier,
};
