<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit/main/docs/static/img/logo.svg" alt="agent-kit logo" width="112"/>

# agent-kit-extensions

**Extensions for agents built on agent-kit, and plugins for Claude Code: the same folder for both.**<br/>
Install one, and your agent gains its tools, its skills and the know-how to use them.

![Claude Code marketplace](https://img.shields.io/badge/Claude%20Code-marketplace-d97757)
![agent-kit extensions](https://img.shields.io/badge/agent--kit-extensions-0b0b0b)
[![validate](https://github.com/falkenslab/agent-kit-extensions/actions/workflows/validate.yml/badge.svg)](https://github.com/falkenslab/agent-kit-extensions/actions/workflows/validate.yml)
[![agent-kit-catalog](https://img.shields.io/npm/v/@falkenslab/agent-kit-catalog?label=agent-kit-catalog&color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/agent-kit-catalog)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](LICENSE)

**[🧭 Browse the extensions](https://falkenslab.github.io/agent-kit-extensions/)** · [📖 agent-kit's documentation](https://falkenslab.github.io/agent-kit/)

</div>

This is Falken's Lab's marketplace of extensions: each one is a Claude Code plugin as it is, which an agent built on [agent-kit](https://github.com/falkenslab/agent-kit) installs from its command or its chat's catalog, and Claude Code from `/plugin`. An extension brings an MCP server (run from npm at a fixed version), the skills and commands that say how to use it well, and the settings it asks for when it's installed.

## ✨ Why these extensions

- 🔁 **One folder, two homes.** Every extension is a valid Claude Code plugin, checked with `claude plugin validate --strict`, and an agent-kit extension.
- 📌 **Fixed versions.** Each server runs from npm at an exact version: everyone gets the same code.
- 🧭 **Know-how included.** Skills and commands, not just tools.
- ⚙️ **Settings asked once.** At install, through Claude Code's `userConfig`; secrets kept apart, never shown to the AI.
- 🛡️ **Plan mode understood.** Tools that only read say so, and agent-kit lets only those through while planning.

## 🚀 Quick start

```bash
# An agent built on agent-kit 0.22 or later (its own command)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle-teacher@falkenslab

# Claude Code 2.1.271 or later
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle-teacher@falkenslab

# Codex
codex plugin marketplace add falkenslab/agent-kit-extensions
codex plugin add moodle-ui-kit@falkenslab
```

An agent whose own marketplace this is (its `officialMarketplace`) offers them in its chat's catalog, without the first command.

Codex installs them too, with their skills and servers, but it has no plugin settings and no commands: `moodle-ui-kit` works fully; `moodle-teacher` and `moodle-student` will, once moodle-mcp asks for your Moodle sites in the chat ([moodle-mcp#25](https://github.com/falkenslab/moodle-mcp/issues/25)); `weather` loads its skill but not its server, which runs from the extension's folder (`${CLAUDE_PLUGIN_ROOT}`, which Codex doesn't expand).

## 🧩 The extensions

| Extension | What it does |
| --- | --- |
| 👩‍🏫 [moodle-teacher](extensions/moodle-teacher/) | Works in the Moodle courses you teach, as you, through [moodle-mcp](https://github.com/falkenslab/moodle-mcp): building them, grading, following the class, checking and reusing courses |
| 🧑‍🎓 [moodle-student](extensions/moodle-student/) | Helps in the Moodle courses you take, as you, through [moodle-mcp](https://github.com/falkenslab/moodle-mcp): what you have left, handing in, quizzes, forums, grades and feedback |
| 🎨 [moodle-ui-kit](extensions/moodle-ui-kit/) | A clean visual style for what your agent publishes in Moodle, with inline styles that work on any site; based on [noeper](https://github.com/noeper)'s [moodle-ui-kit](https://github.com/noeper/moodle-ui-kit) |
| ☀️ [weather](extensions/weather/) | The weather in your city, for an agent that plans with you; also agent-kit's example of an extension with its own MCP server, built step by step in [its tutorial](https://falkenslab.github.io/agent-kit/docs/extensions/writing) |

## 🧭 The catalog

[The catalog page](https://falkenslab.github.io/agent-kit-extensions/) shows every extension as a card, with a search and topic chips; `?topic=miyagi` opens it filtered, so an agent can link to what it offers. The same catalog is one file, [`catalog.json`](catalog.json): each extension's name, version, description, topics, install commands and images.

- 🏷️ **Topics** are Claude Code's own fields: the extension's `keywords`, and its marketplace entry's `tags` and `category`. An audience is a topic too (`miyagi`): an agent on agent-kit offers its users only its `catalogTopics`.
- 🖼️ **Its look**: a `logo` (square) and a `banner` (wide) in its `plugin.json`, under `metadata["agent-kit"].catalog`, files inside its folder.

## 🛠️ Developing

Each extension is a folder in `extensions/` with `.claude-plugin/plugin.json`, `.mcp.json`, `skills/` and `commands/`, listed in `.claude-plugin/marketplace.json` with the same version as its manifest. After changing one, `npx -y @falkenslab/agent-kit-catalog@0.2.0` writes `catalog.json` again (the workflow checks it's up to date, and publishes the page from `site/`). Try a change by linking it into an agent (`my-agent extension add ./extensions/moodle-teacher --link`); the workflow runs `claude plugin validate --strict` on the marketplace and every extension. How an extension is written: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
