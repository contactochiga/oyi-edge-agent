const assert = require("assert");
const { permissionsForRole, hasPermission } = require("../src/lead-agents/permissions");
const { estateContract, deviceContract, auditLogContract } = require("../src/lead-agents/contracts");
const { createRealtimeHub } = require("../src/lead-agents/realtime");
const { createStorageService } = require("../src/lead-agents/storage");

async function main() {
  assert(hasPermission({ role: "super_admin", permissionScopes: [] }, "settings.manage"));
  assert(hasPermission({ role: "security_operator", permissionScopes: [] }, "cameras.view"));
  assert(!hasPermission({ role: "resident", permissionScopes: [] }, "staff.manage"));
  assert(permissionsForRole("admin").includes("estates.write"));

  const estate = estateContract({ id: "est_1", name: "Green Canopy", latitude: 6.4 });
  assert.equal(estate.type, "estate");
  assert.equal(estate.name, "Green Canopy");

  const device = deviceContract({ id: "dev_1", category: "camera", status: "online" });
  assert.equal(device.type, "device");
  assert.equal(device.category, "camera");

  const audit = auditLogContract({ action: "device.command.requested", resource_type: "device", resource_id: "dev_1" });
  assert.equal(audit.type, "audit_log");
  assert.equal(audit.action, "device.command.requested");

  const realtime = createRealtimeHub();
  assert(realtime.stats().events.includes("edge.heartbeat"));

  const storage = createStorageService({ officeStorageDir: "/tmp/ochiga-tier1-smoke" });
  assert.equal(storage.health().driver, "local");

  console.log("tier1 foundation smoke checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
