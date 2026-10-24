#!/usr/bin/env node
// Checks every extension's manifest and skills against the tools its MCP servers really have, at the
// versions they pin: each server is started as its .mcp.json declares it (${CLAUDE_PLUGIN_ROOT} is the
// extension's folder, ${user_config.*} stays unexpanded, as Codex leaves it) and asked for tools/list,
// which needs neither Moodle nor Docker. Remote servers (http, sse) are skipped: they need a sign-in.
//
// Errors: a tool named by a capability, a label, readOnlyTools, confirmTools, serverConfirmTools, a skill
// or a command that its servers don't have; a read-only tool missing from readOnlyTools (once a manifest
// lists it, the kit stops reading readOnlyHint); a destructive tool in readOnlyTools; a capability's skill
// with no folder. Warnings: tools without a label.
//
// Usage: node scripts/check-tools.mjs [extension…]   (no dependencies; Node 22)
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const inCI = Boolean(process.env.GITHUB_ACTIONS);
let errors = 0;
let warnings = 0;
const error = (file, message) => {
  errors++;
  console.log(inCI ? `::error file=${file}::${message}` : `  ✖ ${message}`);
};
const warn = (file, message) => {
  warnings++;
  console.log(inCI ? `::warning file=${file}::${message}` : `  ⚠ ${message}`);
};

/** A stdio server's tools, as tools/list gives them. */
function listTools(name, server, dir) {
  const expand = (value) => value.replaceAll("${CLAUDE_PLUGIN_ROOT}", dir);
  return new Promise((resolve, reject) => {
    const [command, args] = [expand(server.command), (server.args ?? []).map(expand)];
    // On Windows npx is npx.cmd, which Node only starts through cmd.exe.
    const [file, argv] = process.platform === "win32" ? ["cmd.exe", ["/d", "/c", command, ...args]] : [command, args];
    const child = spawn(file, argv, { cwd: dir, env: { ...process.env, ...server.env }, stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    let stderr = "";
    const timer = setTimeout(() => finish(new Error(`${name} gave no tools/list in 180 s. ${stderr.trim().slice(-300)}`)), 180_000);
    const finish = (result) => {
      clearTimeout(timer);
      child.kill();
      result instanceof Error ? reject(result) : resolve(result);
    };
    const send = (message) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
    child.stderr.on("data", (data) => (stderr += data));
    child.on("error", finish);
    child.on("exit", (code) => finish(new Error(`${name} exited (${code}) before tools/list. ${stderr.trim().slice(-300)}`)));
    child.stdout.on("data", (data) => {
      buffer += data;
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 1) {
          send({ method: "notifications/initialized" });
          send({ id: 2, method: "tools/list", params: {} });
        } else if (message.id === 2) {
          if (message.error) finish(new Error(`${name}: tools/list failed: ${message.error.message}`));
          else finish(message.result.tools);
        }
      }
    });
    send({ id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check-tools", version: "1" } } });
  });
}

/**
 * The tool names a skill or a command names in backticks: the marketplace's tools, and names that look like
 * one that doesn't exist (snake_case, starting as a real tool does: `get_`, `list_`, `lab_`…), so a compose
 * key (`depends_on`) or a setting isn't taken for a tool.
 */
function namedTools(text, everyTool) {
  const prefixes = new Set([...everyTool].map((tool) => tool.split("_")[0]));
  const names = new Set();
  for (const [, code] of text.matchAll(/`([^`\n]+)`/g)) {
    const name = code.trim().replace(/\(.*$/, "");
    if (everyTool.has(name) || (/^[a-z]+(_[a-z]+){1,4}$/.test(name) && prefixes.has(name.split("_")[0]))) names.add(name);
  }
  return names;
}

/** A local server's package, without its version (`@falkenslab/moodle-mcp`), or its command: two roles of one server share it. */
const packageOf = (server) => (server.args ?? []).find((arg) => arg.startsWith("@"))?.replace(/@[^@/]+$/, "") ?? server.command;

const marketplace = json(path.join(root, ".claude-plugin/marketplace.json"));
const only = new Set(process.argv.slice(2));
const checked = [];
for (const entry of marketplace.plugins) {
  if (only.size && !only.has(entry.name)) continue;
  const dir = path.resolve(root, entry.source);
  const rel = (file) => path.relative(root, path.join(dir, file)).replaceAll("\\", "/");
  const manifest = json(path.join(dir, ".claude-plugin/plugin.json"));
  const kit = manifest.metadata?.["agent-kit"] ?? {};
  const servers = existsSync(path.join(dir, ".mcp.json")) ? json(path.join(dir, ".mcp.json")).mcpServers ?? {} : {};
  console.log(`\n${entry.name}`);

  const local = Object.entries(servers).filter(([, server]) => server.type !== "http" && server.type !== "sse");
  if (!local.length) {
    console.log(Object.keys(servers).length ? "  remote server only: not checked against its tools" : "  no MCP server");
    checked.push({ entry, dir, rel, manifest, kit, tools: null });
    continue;
  }
  const tools = [];
  for (const [name, server] of local) {
    try {
      tools.push(...(await listTools(name, server, dir)));
    } catch (failure) {
      error(rel(".mcp.json"), failure.message);
    }
  }
  console.log(`  ${tools.length} tools from ${local.map(([name]) => name).join(", ")}`);
  checked.push({ entry, dir, rel, manifest, kit, tools, packages: new Set(local.map(([, server]) => packageOf(server))) });
}

const everyTool = new Set(checked.flatMap((c) => (c.tools ?? []).map((t) => t.name)));
/** Which packages have a tool, for a skill naming another role's tool of its own server. */
const toolPackages = new Map();
for (const c of checked) for (const t of c.tools ?? []) for (const p of c.packages) toolPackages.set(t.name, new Set([...(toolPackages.get(t.name) ?? []), p]));
for (const { entry, dir, rel, kit, tools, packages } of checked) {
  const file = rel(".claude-plugin/plugin.json");
  const header = () => console.log(`\n${entry.name}: checks`);
  header();
  const before = errors + warnings;

  for (const capability of kit.capabilities ?? []) {
    for (const skill of capability.skills ?? []) if (!existsSync(path.join(dir, "skills", skill, "SKILL.md"))) error(file, `capability ${capability.id} names skill ${skill}, which has no skills/${skill}/SKILL.md`);
  }
  if (!tools) {
    if (errors + warnings === before) console.log("  ok");
    continue;
  }
  const names = new Set(tools.map((t) => t.name));
  const lists = {
    ...Object.fromEntries((kit.capabilities ?? []).map((c) => [`capability ${c.id}`, c.tools ?? []])),
    labels: Object.keys(kit.labels ?? {}),
    readOnlyTools: kit.readOnlyTools ?? [],
    confirmTools: kit.confirmTools ?? [],
    serverConfirmTools: kit.serverConfirmTools ?? [],
  };
  for (const [where, list] of Object.entries(lists)) for (const tool of list) if (!names.has(tool)) error(file, `${where} names ${tool}, which its servers don't have`);

  if (kit.readOnlyTools) {
    const listed = new Set(kit.readOnlyTools);
    for (const tool of tools) {
      if (tool.annotations?.readOnlyHint === true && !listed.has(tool.name)) error(file, `readOnlyTools leaves out ${tool.name}, which its server marks read-only (the list replaces readOnlyHint)`);
      if (tool.annotations?.destructiveHint === true && listed.has(tool.name)) error(file, `readOnlyTools lists ${tool.name}, which its server marks destructive`);
    }
  }

  const texts = [];
  for (const folder of ["skills", "commands"]) {
    const base = path.join(dir, folder);
    if (!existsSync(base)) continue;
    for (const item of readdirSync(base, { withFileTypes: true })) {
      const md = item.isDirectory() ? path.join(base, item.name, "SKILL.md") : item.name.endsWith(".md") ? path.join(base, item.name) : null;
      if (md && existsSync(md)) texts.push(md);
    }
  }
  for (const md of texts) {
    const relMd = path.relative(root, md).replaceAll("\\", "/");
    for (const tool of namedTools(readFileSync(md, "utf8"), everyTool)) {
      if (names.has(tool)) continue;
      if (!everyTool.has(tool)) error(relMd, `names ${tool}, which no server in the marketplace has`);
      // The same server's tool in another role (a teacher's tool in moodle-student's skill) isn't there for it.
      else if ([...toolPackages.get(tool)].some((p) => packages.has(p))) error(relMd, `names ${tool}, which its server has only in another role`);
      // Another extension's tool, named on purpose, is fine.
    }
  }

  const unlabelled = [...names].filter((tool) => !(kit.labels ?? {})[tool]);
  if (unlabelled.length) warn(file, `${unlabelled.length} of ${names.size} tools have no label: ${unlabelled.slice(0, 12).join(", ")}${unlabelled.length > 12 ? "…" : ""}`);
  if (errors + warnings === before) console.log("  ok");
}

console.log(`\n${errors} error(s), ${warnings} warning(s).`);
process.exit(errors ? 1 : 0);
