const { execSync } = require("child_process");

const commands = [
  "npm run security:secrets",
  "npm run lint",
  "npm run check",
  "npm run build",
  "npm run edge:camera:dry-run",
  "npm run edge:camera-ai:dry-run",
];

for (const command of commands) {
  execSync(command, {
    stdio: "inherit",
  });
}

console.log("validate:release: release checks completed");
