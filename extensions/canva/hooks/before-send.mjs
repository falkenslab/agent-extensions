// Claude Code's PreToolUse hook for the canva extension: before a tool that sends texts, images or files
// to Canva, it adds the what-goes-to-canva skill's rule to the model's context. It neither asks nor denies:
// the person's own permission settings decide. It reads only the hook's input and sends nothing anywhere.
// No dependencies: Node's own modules. agent-kit and Codex don't run plugin hooks; the skill says the same.
import { readFileSync } from "node:fs";

try {
  JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const context = [
  "This Canva tool sends what it carries to Canva's servers and the person's Canva account.",
  "Send only what the design needs. Other people's personal data (students' or colleagues' names, class lists, grades, emails, photos of people, a document about someone) goes only with the person's explicit yes for this request;",
  "otherwise use placeholders such as [Name] or initials (the what-goes-to-canva skill).",
].join(" ");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: context } }));
