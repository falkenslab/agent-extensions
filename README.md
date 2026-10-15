<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit/main/docs/static/img/logo.svg" alt="agent-kit logo" width="112"/>

# agent-kit-extensions

**Extensions for agents built on agent-kit, and plugins for Claude Code: the same folder for both.**<br/>
Install one, and your agent gains its tools, its skills and the know-how to use them.

![Claude Code marketplace](https://img.shields.io/badge/Claude%20Code-marketplace-d97757)
![agent-kit extensions](https://img.shields.io/badge/agent--kit-extensions-0b0b0b)
[![validate](https://github.com/falkenslab/agent-kit-extensions/actions/workflows/validate.yml/badge.svg)](https://github.com/falkenslab/agent-kit-extensions/actions/workflows/validate.yml)
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
my-agent extension add moodle@falkenslab

# Claude Code 2.1.271 or later
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle@falkenslab
```

An agent whose own marketplace this is (its `officialMarketplace`) offers them in its chat's catalog, without the first command.

## 🧩 The extensions

| Extension | What it does |
| --- | --- |
| 🎓 [moodle](moodle/) | Works in your Moodle courses as you, through [moodle-mcp](https://github.com/falkenslab/moodle-mcp): grading with rubrics, quizzes from question banks, copies between sites |
| ☀️ [weather](weather/) | The weather in your city, for an agent that plans with you; also agent-kit's example of an extension with its own MCP server, built step by step in [its tutorial](https://falkenslab.github.io/agent-kit/docs/next/extensions/writing) |

## 🧭 The catalog

[The catalog page](https://falkenslab.github.io/agent-kit-extensions/) shows every extension as a card, with a search and topic chips; `?topic=miyagi` opens it filtered, so an agent can link to what it offers. The same catalog is one file, [`catalog.json`](catalog.json): each extension's name, version, description, topics, install commands and images.

- 🏷️ **Topics** are Claude Code's own fields: the extension's `keywords`, and its marketplace entry's `tags` and `category`. An audience is a topic too (`miyagi`): an agent on agent-kit offers its users only its `catalogTopics`.
- 🖼️ **Its look**: a `logo` (square) and a `banner` (wide) in its `plugin.json`, under `metadata["agent-kit"].catalog`, files inside its folder.

## 🛠️ Developing

Each extension is a folder with `.claude-plugin/plugin.json`, `.mcp.json`, `skills/` and `commands/`, listed in `.claude-plugin/marketplace.json` with the same version as its manifest. After changing one, `node scripts/build-catalog.mjs` writes `catalog.json` again (the workflow checks it's up to date, and publishes the page from `site/`). Try a change by linking it into an agent (`my-agent extension add ./moodle --link`); the workflow runs `claude plugin validate --strict` on the marketplace and every extension. How an extension is written: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/next/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
