#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function exists(file) {
  try {
    fs.accessSync(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function executable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  const root = path.resolve(__dirname, "..");
  const localRegistry = path.join(root, "edge/camera/registry/local.camera-registry.json");
  const registryPath = path.resolve(root, process.argv[2] || process.env.CAMERA_REGISTRY_PATH || (exists(localRegistry) ? localRegistry : "examples/camera-registry.example.json"));
  const localGo2rtc = process.env.GO2RTC_BIN || "/Users/ochigaidoko/go2rtc/go2rtc";
  const legacyGo2rtcConfig = "/Users/ochigaidoko/go2rtc/go2rtc.yaml";
  const repoGo2rtcConfig = path.join(root, "go2rtc.yaml");

  const checks = [];
  checks.push({ check: "camera registry readable", ok: exists(registryPath), path: registryPath });
  checks.push({ check: "repo go2rtc config present", ok: exists(repoGo2rtcConfig), path: repoGo2rtcConfig });
  checks.push({ check: "previous local go2rtc binary present", ok: executable(localGo2rtc), path: localGo2rtc });
  checks.push({ check: "previous local go2rtc config present", ok: exists(legacyGo2rtcConfig), path: legacyGo2rtcConfig, note: "Do not commit this file; it may contain local credentials." });

  if (exists(registryPath)) {
    const registry = readJson(registryPath);
    const cameras = Array.isArray(registry.cameras) ? registry.cameras : [];
    checks.push({ check: "registry has enabled cameras", ok: cameras.some((camera) => camera.enabled !== false), count: cameras.length });
  }

  const dryRun = spawnSync(process.execPath, ["scripts/generate-go2rtc-config.js", "--dry-run", "--registry", registryPath], {
    cwd: root,
    encoding: "utf8",
  });
  checks.push({ check: "go2rtc config dry-run", ok: dryRun.status === 0, detail: dryRun.status === 0 ? "configurable" : dryRun.stderr || dryRun.stdout });

  const ok = checks.every((item) => item.ok);
  console.log(JSON.stringify({ ok, checks }, null, 2));
  if (!ok) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
