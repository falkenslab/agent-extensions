// Claude Code's PostToolUse hook for the asker extension: after a .haml (or an Asker .xml) is written
// or edited, a quick look for what Asker trips on (tabs, invisible characters, odd indentation, a
// byte-order mark, an empty %def, a %map without lang), told to the model with its lines, and a
// reminder to run check_input. It reads only the file the tool wrote, and never changes anything.
// No dependencies: Node's own modules. agent-kit and Codex don't run plugin hooks; the skills say the same.
import { readFileSync } from "node:fs";

const LANGUAGES = ["en", "es", "fr", "ca", "du"];
// Non-breaking, zero-width and other invisible spaces, built from their codes so this file stays ASCII.
const INVISIBLE = new RegExp(`[${[0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x200b, 0x202f, 0x205f, 0x3000, 0xfeff].map((c) => String.fromCharCode(c)).join("")}]`);
const BOM = String.fromCharCode(0xfeff);

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function lint(file, text) {
  const found = [];
  if (!text.trim()) return ["the file is empty"];
  if (text.startsWith(BOM)) found.push("line 1: a byte-order mark (BOM) at the start, which Asker reads as spaces before %map: save it as UTF-8 without BOM");
  if (/\.xml$/i.test(file)) {
    if (!/<map\b[^>]*\blang\s*=\s*['"](en|es|fr|ca|du)['"]/.test(text)) found.push(`<map> needs a lang Asker knows (${LANGUAGES.join(", ")})`);
    return found;
  }
  let sawMap = false;
  text
    .replace(BOM, "")
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = index + 1;
      if (!raw.trim() || /^\s*\/\//.test(raw)) return;
      if (raw.includes("\t")) found.push(`line ${line}: a tab; Asker's HAML counts spaces`);
      if (INVISIBLE.test(raw)) found.push(`line ${line}: an invisible character (a non-breaking or zero-width space); retype the line's spaces`);
      const indent = /^ */.exec(raw)[0].length;
      if (indent % 2 === 1) found.push(`line ${line}: indented with ${indent} spaces; Asker indents in steps of two`);
      const keyword = /^\s*%(\w+)(\{[^}]*\})?\s*(.*)$/.exec(raw);
      if (!keyword) return;
      const [, tag, attributes = "", value] = keyword;
      if (!sawMap) {
        sawMap = true;
        if (tag !== "map") found.push(`line ${line}: the first line must be the %map{ lang: '…', context: '…', version: '1'}`);
      }
      if (tag === "map") {
        const lang = /lang:\s*'([^']*)'/.exec(attributes)?.[1] ?? /:lang\s*=>\s*'([^']*)'/.exec(attributes)?.[1];
        if (!lang || !LANGUAGES.includes(lang)) found.push(`line ${line}: %map needs a lang Asker knows (${LANGUAGES.join(", ")})`);
      }
      if (tag === "def" && /%def\s+\{/.test(raw)) found.push(`line ${line}: a space between %def and {`);
      else if (tag === "def" && !value.trim()) found.push(`line ${line}: a %def with no text`);
    });
  return found;
}

const input = readInput();
const file = input?.tool_input?.file_path ?? input?.tool_input?.path;
if (typeof file !== "string" || !/\.(haml|xml)$/i.test(file)) process.exit(0);
let text;
try {
  text = readFileSync(file, "utf8");
} catch {
  process.exit(0);
}
// An .xml that isn't an Asker input (a Moodle XML, say) isn't this hook's business.
if (/\.xml$/i.test(file) && !/<map[\s>]/.test(text)) process.exit(0);
if (/\.haml$/i.test(file) && !/%map\b/.test(text) && !/%concept\b/.test(text)) process.exit(0);

const found = lint(file, text);
const context = [
  `${file} is an Asker definitions file.`,
  found.length ? `A quick look found: ${found.slice(0, 10).join("; ")}${found.length > 10 ? `; and ${found.length - 10} more` : ""}.` : "",
  "Run check_input on it (asker server) before generating questions, and fix what it says.",
]
  .filter(Boolean)
  .join(" ");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } }));
