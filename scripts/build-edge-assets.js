const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const requiredFiles = [
  "agent.js",
  "src/edge/intelligence-events.js",
  "scripts/edge-camera-common.js",
  "scripts/generate-go2rtc-config.js",
  "scripts/check-camera-runtime-readiness.js",
  "scripts/camera-ai-processor.js",
  "src/camera/inference-provider.js",
  "src/camera/providers/external-detector.js",
  "src/camera/inference-runtime.js",
  "src/camera/detection-outbox.js",
  "scripts/setup-camera-edge.js",
  "examples/camera-registry.example.json",
  "EDGE_PHASE_1_CAMERA_PROTOCOL_ONBOARDING.md",
];

const missing = requiredFiles.filter((relativePath) => {
  return !fs.existsSync(path.join(ROOT, relativePath));
});

if (missing.length > 0) {
  throw new Error(`Edge build validation failed. Missing files: ${missing.join(", ")}`);
}

console.log(`build: validated ${requiredFiles.length} Edge runtime assets`);
