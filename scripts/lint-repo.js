const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function requireFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function requireText(relativePath, matcher, message) {
  const fullPath = path.join(ROOT, relativePath);
  const content = fs.readFileSync(fullPath, "utf8");
  if (!matcher.test(content)) {
    throw new Error(`${relativePath}: ${message}`);
  }
}

[
  "README.md",
  "agent.js",
  "src/edge/intelligence-events.js",
  "scripts/edge-camera-common.js",
  "scripts/generate-go2rtc-config.js",
  "scripts/check-camera-runtime-readiness.js",
  "scripts/camera-ai-processor.js",
  "examples/camera-registry.example.json",
  "EDGE_PHASE_1_CAMERA_PROTOCOL_ONBOARDING.md",
].forEach(requireFile);

[
  "lead-agents-server.js",
  "src/lead-agents/server.js",
  "public/dashboard/index.html",
  "public/widget/oma-widget.js",
  "db/lead-agents-schema.sql",
  "prompt-packs/sales-agent/prompt-pack.json",
].forEach((relativePath) => {
  const fullPath = path.join(ROOT, relativePath);
  if (fs.existsSync(fullPath)) {
    throw new Error(`Edge repository must not contain Office runtime file: ${relativePath}`);
  }
});

requireText(
  ".gitignore",
  /^edge\/camera\/registry\/local\*\.json$/m,
  "must ignore local camera registry files"
);
requireText(
  "README.md",
  /Oyi Edge Agent/,
  "must describe Edge runtime ownership"
);
requireText(
  "src/edge/intelligence-events.js",
  /function normalizeEvent/,
  "must keep Edge event normalization local"
);

console.log("lint: Edge repository structure and release markers look good");
