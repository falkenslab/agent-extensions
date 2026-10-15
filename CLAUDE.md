# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Falken's Lab's marketplace (`falkenslab`) of extensions. Each extension folder is both a Claude Code plugin, unchanged, and an extension for agents built on [agent-kit](https://github.com/falkenslab/agent-kit). There is no application code: the repository is JSON manifests, Markdown skills and commands, SVG assets, the `weather` example server and a static catalog page.

## Commands

Node 22, no dependencies, no `npm install` at the root.

- `npx -y @falkenslab/agent-kit-catalog@0.1.0` rewrites `catalog.json` from the manifests. Run it after any change to `.claude-plugin/marketplace.json` or an extension's `plugin.json`, and commit the result. The generator lives in agent-kit (the `agent-kit-catalog` package), with the catalog's format; bump its pinned version here and in both workflows together.
- `npx -y @falkenslab/agent-kit-catalog@0.1.0 --check` fails if `catalog.json` is stale (CI runs it in both workflows).
- The links point to `--repo owner/name`, else `GITHUB_REPOSITORY`, else the `origin` remote, else the `repository` shared by every `plugin.json`; the branch is `--branch`, else always `main` (never the checked-out one, so the output is the same on every branch).
- `claude plugin validate --strict .` validates the marketplace; `claude plugin validate --strict moodle-teacher` validates one extension. Strict means warnings fail. `userConfig` with `options` needs Claude Code 2.1.271 or later.
- `weather/` builds its own MCP server: `npm install` and `npm run build` in `weather/` write `weather/dist/server.mjs`, which is committed (agent-kit installs files and never runs `npm install`); its `node_modules/` stays out. Rebuild it after any change to `weather/src/`.
- To try an extension in an agent: `my-agent extension add ./moodle-teacher --link`.
- To preview the catalog page, serve the repository root over HTTP and open `site/index.html` (it fetches `catalog.json` or `../catalog.json`).

## How the pieces fit

- **`.claude-plugin/marketplace.json`** lists every extension with `source`, `version`, `category` and `tags`. The `version` must equal the one in the extension's `plugin.json`; the catalog generator fails otherwise. Only local `./folder` sources are supported by the catalog.
- **An extension** (e.g. `moodle-teacher/`) has `.claude-plugin/plugin.json`, `.mcp.json`, `skills/<name>/SKILL.md`, `commands/<name>.md`, `assets/` and a `README.md`.
- **`.mcp.json`** runs the MCP server: the two moodle extensions' from npm at the same exact pinned version (`npx -y @falkenslab/moodle-mcp@0.3.0`; bump both together), each with its role fixed (`MOODLE_MCP_ROLE`: `teacher` or `student`), and maps `userConfig` values into env vars with `${user_config.<key>}`. Bumping the server version is an edit here. weather's runs its bundled `dist/server.mjs` with `node ${CLAUDE_PLUGIN_ROOT}/dist/server.mjs`.
- **`plugin.json` `userConfig`** is the settings asked at install time. Its keys must match the `${user_config.*}` references in `.mcp.json`.
- **`plugin.json` `metadata["agent-kit"]`** is read only by agent-kit: `catalog.logo` (square) and `catalog.banner` (wide) as paths inside the extension folder, `provides`/`requires`, a `help` line, and `labels` giving each MCP tool a progress label and singular/plural phrase in `en` and `es`. A new tool in the MCP server should get a `labels` entry in both languages.
- **Topics** shown in the catalog are the union, lowercased, of `plugin.json` `keywords` plus the marketplace entry's `tags`, `keywords` and `category`. An audience is a topic too (`miyagi`): agent-kit agents offer their users only extensions matching their `catalogTopics`.
- **`catalog.json`** is generated, never edited by hand. Image paths become `raw.githubusercontent.com/.../main/...` URLs, so assets must exist and be committed on `main`.
- **`site/index.html`** is a self-contained catalog page (search, topic chips, `?topic=` filter) reading `catalog.json`. The `pages` workflow publishes `site/index.html` and `catalog.json` to GitHub Pages on every push to `main`.

## Conventions

- `.gitattributes` forces LF everywhere because agent-kit verifies extension files by hash; don't introduce CRLF.
- Skills and commands are written to the agent, in English, telling it how to use the MCP tools well (name the actual tool names, say what needs the person's approval, and whether a command only reads).
- An extension knows its platform, not the domain around it: the `moodle-teacher` and `moodle-student` skills say how things are done in Moodle (settings, tools, what Moodle imposes), never how to teach or to study. That practice lives in the agent that installs the extension (miyagi for teachers, padawan for students). Every tool a skill names must exist in the pinned server version and in its role (moodle-mcp's tools reference marks each tool's roles); where none covers a task, say so and fall back to the person or to the `browser_*` tools with their yes.
- When adding an extension, also add its row to the extensions table in the root `README.md`.
- Writing an extension is documented upstream: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing), whose tutorial builds `weather/`.
