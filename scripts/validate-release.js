const { execSync } = require("child_process");

const commands = ["npm run lint", "npm run check", "npm run build"];

for (const command of commands) {
  execSync(command, {
    stdio: "inherit",
  });
}

console.log("validate:release: release checks completed");
