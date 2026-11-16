#!/usr/bin/env node
// Codex's own manifests, generated from what the extensions already say, so nobody keeps them by hand:
// - extensions/<name>/.codex-plugin/plugin.json: the plugin as Codex shows it in its app (display name, logo,
//   short and long description, category, example prompts, links), and where its skills, server and hooks are;
// - .agents/plugins/marketplace.json: Codex's marketplace, with each plugin's install and sign-in policy.
// From each plugin.json, its README (the bold promise under the title, and the "💬" section's first examples),
// its assets, its marketplace entry and catalog.json (run agent-kit-catalog first). Codex reads .claude-plugin too; these only make it look and behave better.
//   node scripts/codex-manifests.mjs          writes them
//   node scripts/codex-manifests.mjs --check  fails if any is missing or stale (CI)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

// Codex's categories, from ours (the marketplace entry's category).
const CATEGORIES = { education: "Education & Research", design: "Design", development: "Developer Tools", productivity: "Productivity" };
// Names as people write them, where splitting on dashes isn't enough.
const DISPLAY = { h5p: "H5P", "moodle-ui-kit": "Moodle UI Kit", "docker-lab": "Docker Lab" };
const BRAND_COLOR = "#E5483A";
const REPOSITORY = "https://github.com/falkenslab/agent-extensions";

const displayName = (name) => DISPLAY[name] ?? name.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

// The README's promise: the first bold line under its title.
function promise(readme) {
  const line = readme.split("\n").find((l) => /^\*\*[^*]+\*\*/.test(l.trim()));
  return line ? line.trim().match(/^\*\*([^*]+)\*\*/)[1].trim() : undefined;
}

// What to ask: the README's "💬" section, its first three items, without emoji and Markdown.
function examples(readme) {
  const lines = readme.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## 💬"));
  if (start < 0) return [];
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).replace(/^[\p{Extended_Pictographic}‍️\s]+/u, "").replace(/\*\*|`|_/g, "").replace(/^["“](.*)["”]$/, "$1").trim())
    .filter(Boolean)
    .slice(0, 3);
}

// Read, Write, Interactive, as Codex describes a plugin: what its tools do, from catalog.json (each tool's readOnly,
// from agent-kit's readOnlyTools or its server's readOnlyHint).
const catalog = json("catalog.json");
// Extensions whose tools only read but say so nowhere: weather's tutorial server sets no readOnlyHint.
const READS_ONLY = new Set(["weather"]);
function capabilities(name) {
  const tools = catalog.extensions.find((e) => e.name === name)?.tools ?? [];
  if (!tools.length) return ["Interactive"];
  if (READS_ONLY.has(name)) return ["Interactive", "Read"];
  return ["Interactive", ...(tools.some((t) => t.readOnly) ? ["Read"] : []), ...(tools.some((t) => !t.readOnly) ? ["Write"] : [])];
}

function codexPlugin(dir, entry) {
  const base = `extensions/${dir}`;
  const manifest = json(`${base}/.claude-plugin/plugin.json`);
  const readme = read(`${base}/README.md`);
  const has = (file) => existsSync(path.join(root, base, file));
  const servers = has(".mcp.json");
  const screenshots = has("assets") ? readdirSync(path.join(root, base, "assets")).filter((f) => /^screenshot.*\.png$/.test(f)).map((f) => `./assets/${f}`) : [];
  const logo = manifest.metadata?.["agent-kit"]?.catalog?.logo;
  const interfaceFields = {
    displayName: displayName(manifest.name),
    shortDescription: promise(readme) ?? manifest.description,
    longDescription: manifest.description,
    developerName: manifest.author?.name ?? "Falken's Lab",
    category: CATEGORIES[entry.category] ?? "Productivity",
    capabilities: capabilities(manifest.name),
    websiteURL: manifest.homepage,
    supportURL: `${REPOSITORY}/issues`,
    defaultPrompt: examples(readme),
    brandColor: BRAND_COLOR,
    ...(logo ? { logo: `./${logo.replace(/^\.\//, "")}`, composerIcon: `./${logo.replace(/^\.\//, "")}` } : {}),
    ...(screenshots.length ? { screenshots } : {}),
  };
  if (!interfaceFields.defaultPrompt.length) delete interfaceFields.defaultPrompt;
  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    homepage: manifest.homepage,
    repository: manifest.repository,
    license: manifest.license,
    keywords: manifest.keywords,
    ...(has("skills") ? { skills: "./skills/" } : {}),
    ...(servers ? { mcpServers: "./.mcp.json" } : {}),
    ...(has("hooks/hooks.json") ? { hooks: "./hooks/hooks.json" } : {}),
    interface: interfaceFields,
  };
}

const marketplace = json(".claude-plugin/marketplace.json");
const outputs = new Map();
const plugins = [];
for (const entry of marketplace.plugins) {
  const dir = entry.source.replace(/^\.\/extensions\//, "");
  outputs.set(`extensions/${dir}/.codex-plugin/plugin.json`, codexPlugin(dir, entry));
  // A remote server signs in with the person's account: Codex asks for it when the plugin is installed.
  plugins.push({
    name: entry.name,
    source: { source: "local", path: entry.source },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: CATEGORIES[entry.category] ?? "Productivity",
  });
}
outputs.set(".agents/plugins/marketplace.json", { name: marketplace.name, interface: { displayName: "Falken's Lab" }, plugins });

const stale = [];
for (const [file, value] of outputs) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const target = path.join(root, file);
  if (check) {
    if (!existsSync(target) || readFileSync(target, "utf8") !== text) stale.push(file);
    continue;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
}
if (check && stale.length) {
  console.error(`Codex's manifests are stale: ${stale.join(", ")}. Run node scripts/codex-manifests.mjs and commit them.`);
  process.exit(1);
}
console.log(check ? `Codex's manifests are up to date (${outputs.size} files).` : `Codex's manifests: ${outputs.size} files written.`);
