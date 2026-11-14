// Claude Code's PreToolUse hook for the docker-lab extension: before a shell command that runs docker
// (or docker compose), it adds a reminder to the model's context. It neither asks nor denies: the person's
// own permission settings decide. Running docker from the shell goes around docker-mcp's mode (read, lab or
// full), its confirmations and the labs' safety policy, so the skills ask for docker-mcp's tools instead.
// No dependencies: Node's own modules. agent-kit and Codex don't run plugin hooks; the skills say the same.
import { readFileSync } from "node:fs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const command = String(input?.tool_input?.command ?? "");
if (!/(^|[\s;&|(`])(docker|docker-compose)(\s|$)/.test(command)) process.exit(0);

const context = [
  "This shell command runs Docker directly, outside docker-mcp.",
  "With the docker-lab extension, use docker-mcp's tools instead (use-docker for the person's Docker, try-in-a-lab and verify-by-running for anything to try or run):",
  "they keep the mode the person chose (read, lab or full), its confirmations and the labs' safety policy.",
  "Run docker from the shell only if the person asked for exactly that.",
].join(" ");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: context } }));
