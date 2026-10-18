<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit-extensions/main/extensions/docker-lab/assets/logo.svg" alt="docker-lab logo: a cube inside a dashed boundary, a sandbox" width="112"/>

# docker-lab

**Your AI agent runs and tries software in Docker labs, without touching your computer.**<br/>
Tools, services and someone's code in isolated containers, verified by running them, through docker-mcp, in the mode you choose.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Docker 24+](https://img.shields.io/badge/Docker-24%2B-1d63ed?logo=docker&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 docker-mcp's documentation](https://falkenslab.github.io/docker-mcp/)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), Claude Code or Codex the [docker-mcp](https://github.com/falkenslab/docker-mcp) server and what to do with it: use Docker as a lab where the agent runs and tries software (a tool that isn't installed, a database for a while, a script someone sent, a project to check) in isolated containers, without internet, without host mounts and with limits, so nothing gets installed on your computer and nothing untrusted runs on it. It verifies that code, instructions or a submission work by running them, with a verdict and its evidence, and, in full mode, manages your Docker too. It knows Docker, not teaching or studying: an agent that knows how to teach, like [miyagi](https://github.com/falkenslab/miyagi), or to learn, like [padawan](https://github.com/falkenslab/padawan), installs it to run and check practices. It runs docker-mcp from npm, at a fixed version, on the Docker of your computer.

## ✨ Why this extension

- 🧪 **Nothing installed, nothing untrusted on your computer.** What needs trying runs in a lab: no internet, no host mounts, limits on CPU and memory, gone in one call.
- 🎚️ **You choose how far it goes.** `read` only looks, `lab` only runs labs, `full` does everything Docker does; a tool outside the mode doesn't exist for the agent.
- 🛡️ **Asks before the dangerous.** Removing anything waits for your yes, and a privileged container or the Docker socket needs your explicit agreement.
- ✅ **Verified by running, not by reading.** Whether something works is answered with the commands run, their exit codes and their output, and a lab can carry its own check.
- 🔧 **Explains, never installs.** Without Docker, or with it stopped, it says how to install or start it.
- 🤖 **For teachers and students.** Labs for practices that check themselves; installed in `lab` mode, a student's agent gets the labs and nothing else.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, [Docker](https://docs.docker.com/get-started/get-docker/) 24 or later, running, and an agent on agent-kit 0.23 or later, Claude Code 2.1.271 or later, or Codex.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add docker-lab@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install docker-lab@falkenslab
```

Both ask for its settings when you install it: the mode first (`lab` to give it only the labs, as for a student), and the labs' options below. Then ask: "Is Docker running, and in what mode are you?"

Codex installs it too (`codex plugin marketplace add falkenslab/agent-kit-extensions`, then `codex plugin add docker-lab@falkenslab`), with its skills and server, but it has no plugin settings: it runs in `full` mode with the default labs folder. For another mode, add docker-mcp as a server of your own, as [its configuration page](https://falkenslab.github.io/docker-mcp/configuration) shows.

## ⚙️ Settings

| Setting | What it does | Default |
| --- | --- | --- |
| `mode` | `full` (everything, asking before the dangerous), `lab` (only labs) or `read` (only look) | `full` |
| `scopes` | Only some areas, comma-separated: `containers`, `images`, `volumes`, `networks`, `compose`, `system`, `labs` | all |
| `labs_dir` | The folder with the labs, one folder per lab | `labs` in its data folder |
| `allow_internet` | Labs reach the internet and publish ports | no |
| `cpus` | CPUs per lab service | `1` |
| `memory` | Memory per lab service | `512m` |
| `allowed_images` | Images a lab may use, comma-separated | any |

Change them later with `my-agent extension config docker-lab`, in the chat with `/extensions config docker-lab`, from a desktop agent's extension settings, or in Claude Code's `/plugin`. docker-mcp reads them when it starts, so a change applies in the next session.

## 💬 What you can ask

- 🧑‍💻 "I don't have Python 3.13: try this script with it, without installing anything."
- 🧑‍💻 "Someone sent me this repository: does it build and do its tests pass?"
- 🧑‍💻 "Start a PostgreSQL 17 with a volume for its data, on port 5432 only for this computer."
- 🧑‍💻 "Why does my web container keep restarting? Look at its logs."
- 👩‍🏫 "Follow my statement step by step in a lab and tell me where it breaks; then check the solution passes."
- 👩‍🏫 "Make a lab with a web app and its database, with a check that the data survives a restart."
- 🧑‍🎓 "Start my practice lab and tell me if it works now."
- 🧑‍🎓 "Reset my lab: I broke the database."

## 📸 See it at work

<p align="center">
<img src="https://raw.githubusercontent.com/falkenslab/docker-mcp/main/docs/static/img/see-it-claude-code.png" alt="Claude Code starting a lab with docker-mcp and its check passing" width="760"/>
</p>

<p align="center"><em>Claude Code, in lab mode: it starts a practice lab and its check passes, through docker-mcp.</em></p>

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/docker-mcp@0.1.0`, its 47 tools narrowed by your mode and areas |
| 🧪 `try-in-a-lab` | Trying a tool, a service or someone's code in a disposable lab: the image, the lab, the report, the clean-up |
| 🏗️ `build-a-lab` | A reproducible lab of one or more services: its compose file and check, the safety policy, starting, resetting and stopping it |
| ✅ `verify-by-running` | Whether code, instructions, a statement and its solution or a submission work, with a verdict and its evidence, and writing a lab's check |
| 🐳 `use-docker` | Your Docker: containers, images, volumes, networks, Compose and clean-ups, what to confirm, the dangerous options, a missing Docker |

## 📚 Documentation

- **[docker-mcp's documentation](https://falkenslab.github.io/docker-mcp/)**: the server, its settings and Codex's configuration.
- **[Modes and settings](https://falkenslab.github.io/docker-mcp/modes)**: what each mode allows, the areas and the labs' policy.
- **[docker-mcp's tools](https://falkenslab.github.io/docker-mcp/reference/tools)**: every tool, with what each mode keeps.
- **[Installing extensions](https://falkenslab.github.io/agent-kit/docs/extensions/installing)**: in an agent built on agent-kit.

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (its settings in `userConfig`, agent-kit's data in `metadata["agent-kit"]`, Docker as a requirement), `.mcp.json` and `skills/`. To try a change, link it into an agent instead of installing it (`my-agent extension add ./extensions/docker-lab --link`), and check it with `claude plugin validate --strict extensions/docker-lab`. How agent-kit runs it: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
