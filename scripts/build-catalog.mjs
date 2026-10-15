#!/usr/bin/env node
// The marketplace's catalog as one file, catalog.json: each extension's name, version, description,
// topics, category, author, links, install commands and images (as raw.githubusercontent.com URLs),
// from .claude-plugin/marketplace.json and each extension's plugin.json. Agents, the public page
// (site/) and anyone else read it without cloning the repository. Nothing in it is this repository's
// own: any marketplace on GitHub can run it as it is.
//
//   node scripts/build-catalog.mjs           writes catalog.json
//   node scripts/build-catalog.mjs --check   fails when catalog.json isn't what it would write
//
// The GitHub repository the links point to: --repo owner/name, else GITHUB_REPOSITORY (set in GitHub
// Actions), else the origin remote, else the `repository` all the plugin.json files name. The branch:
// --branch name, else main. Not the branch checked out,
// so catalog.json reads the same on every branch and --check passes on pull requests.
import { readFile, writeFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE = /\.(svg|png|jpe?g|webp)$/i;

/** The value after a --name argument, as --name value or --name=value. */
function option(name) {
  const args = process.argv.slice(2);
  const at = args.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (at < 0) return undefined;
  return args[at].includes("=") ? args[at].slice(args[at].indexOf("=") + 1) : args[at + 1];
}

/** owner/name from the origin remote, when it's on GitHub (https or ssh). */
function originRepo() {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/)?.[1];
  } catch {
    return undefined;
  }
}

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const marketplace = await readJson(path.join(root, ".claude-plugin", "marketplace.json"));

/** owner/name from the extensions' own `repository`, when they all name the same one on GitHub. */
async function manifestsRepo() {
  const repos = new Set();
  for (const entry of marketplace.plugins) {
    if (typeof entry.source !== "string") continue;
    const manifest = await readJson(path.join(root, entry.source, ".claude-plugin", "plugin.json")).catch(() => ({}));
    const url = typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;
    const repo = url?.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/)?.[1];
    if (repo) repos.add(repo);
  }
  return repos.size === 1 ? [...repos][0] : undefined;
}

const REPO = option("repo") || process.env.GITHUB_REPOSITORY || originRepo() || (await manifestsRepo());
const BRANCH = option("branch") || "main";
if (!REPO || !/^[\w.-]+\/[\w.-]+$/.test(REPO)) {
  console.error("Which GitHub repository is this? Pass --repo owner/name (no GITHUB_REPOSITORY, no GitHub origin remote, no single repository in the plugin.json files).");
  process.exit(1);
}
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

/** An image of an extension's, as a URL anyone can load, when it's a file inside its folder. */
async function image(folder, relative) {
  if (typeof relative !== "string" || !IMAGE.test(relative)) return undefined;
  const file = path.resolve(root, folder, relative);
  if (path.relative(path.resolve(root, folder), file).startsWith("..")) return undefined;
  if (!(await stat(file).catch(() => null))?.isFile()) throw new Error(`${folder}: its ${relative} doesn't exist.`);
  return `${RAW}/${path.relative(root, file).split(path.sep).join("/")}`;
}

const extensions = [];
for (const entry of marketplace.plugins) {
  if (typeof entry.source !== "string") throw new Error(`${entry.name}: only extensions kept in this repository are cataloged.`);
  const folder = entry.source.replace(/^\.\//, "");
  const manifest = await readJson(path.join(root, folder, ".claude-plugin", "plugin.json"));
  if (manifest.version !== entry.version) throw new Error(`${entry.name}: plugin.json says ${manifest.version}, marketplace.json ${entry.version}.`);
  const look = manifest.metadata?.["agent-kit"]?.catalog ?? {};
  const topics = [...new Set([...(manifest.keywords ?? []), ...(entry.tags ?? []), ...(entry.keywords ?? []), ...(entry.category ? [entry.category] : [])].map((topic) => topic.toLowerCase()))];
  const [logo, banner] = [await image(folder, look.logo), await image(folder, look.banner)];
  extensions.push({
    name: entry.name,
    version: manifest.version,
    description: entry.description ?? manifest.description ?? "",
    category: entry.category ?? null,
    topics,
    author: manifest.author?.name ?? marketplace.owner?.name ?? null,
    license: manifest.license ?? null,
    homepage: manifest.homepage ?? `https://github.com/${REPO}/tree/${BRANCH}/${folder}`,
    readme: `https://github.com/${REPO}/blob/${BRANCH}/${folder}/README.md`,
    install: {
      claudeCode: `claude plugin install ${entry.name}@${marketplace.name}`,
      agentKit: `extension add ${entry.name}@${marketplace.name}`,
    },
    ...(logo ? { logo } : {}),
    ...(banner ? { banner } : {}),
  });
}

const catalog = {
  marketplace: marketplace.name,
  description: marketplace.metadata?.description ?? "",
  repository: `https://github.com/${REPO}`,
  add: { claudeCode: `claude plugin marketplace add ${REPO}`, agentKit: `extension marketplace add ${REPO}` },
  extensions: extensions.sort((a, b) => a.name.localeCompare(b.name)),
};
const text = `${JSON.stringify(catalog, null, 2)}\n`;
const target = path.join(root, "catalog.json");
if (process.argv.includes("--check")) {
  const current = await readFile(target, "utf8").catch(() => "");
  if (current.replace(/\r\n/g, "\n") !== text) {
    console.error("catalog.json is out of date: run node scripts/build-catalog.mjs and commit it.");
    process.exit(1);
  }
  console.log(`catalog.json is up to date (${extensions.length} extensions).`);
} else {
  await writeFile(target, text, "utf8");
  console.log(`catalog.json: ${extensions.length} extensions.`);
}
