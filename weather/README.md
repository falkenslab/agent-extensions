<div align="center">

<img src="assets/logo.svg" alt="weather logo: a sun behind a cloud" width="96"/>

# weather

**The weather in your city, for an agent that plans with you.**<br/>
Today and the next days, from Open-Meteo: no account, no key.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../LICENSE)

**[📖 How it was built, step by step](https://falkenslab.github.io/agent-kit/docs/next/extensions/writing)**

</div>

weather gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, the forecast for the person's city: the temperature now, and each day's range, rain chance and wind. It's also agent-kit's example of an installable extension with its own MCP server, written with the official MCP SDK and bundled into one file: the tutorial [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/next/extensions/writing) builds it from scratch.

## ✨ What it shows

- 🔌 **Its own MCP server**, `src/server.mjs`, bundled with esbuild into `dist/server.mjs`: the kit installs files and never runs `npm install`.
- ⚙️ **A setting the person gives once**, their city (and the units), as Claude Code's `userConfig`.
- 🔒 **A tool that only reads**, marked `readOnlyHint`: plan mode lets it through without a list in the manifest.
- 🏷️ **Labels** for the chat in English and Spanish, a **logo** for the catalog, a **skill** and a **command**.

## 🚀 Quick start

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add weather@falkenslab --set "city=Santa Cruz de Tenerife"

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install weather@falkenslab
```

Then ask: "What's the weather like this week?", "When should I go for a walk tomorrow?", or `/weather:today`.

## ⚙️ Settings

| Setting | What it does | Default |
| --- | --- | --- |
| `city` | Where you are, e.g. `Santa Cruz de Tenerife` | required |
| `units` | `metric` (°C, km/h) or `imperial` (°F, mph) | `metric` |

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 `forecast` | The weather now and the next days (1 to 7) in your city, or another you name |
| 🗓️ `plan-the-day` | A skill: plan the day or week around the forecast, with a plan B when rain is likely |
| ☀️ `/weather:today` | Today's weather in two lines |

## 🛠️ Developing

The server's source is `src/server.mjs`; `npm install` then `npm run build` writes `dist/server.mjs`, which is committed (`package.json` and `src/` are only for building it). Try a change linked into an agent: `my-agent extension add ./weather --link --set city=Madrid`, then `/extensions disable weather` and `enable` after each build.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
