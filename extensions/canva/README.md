<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/canva/assets/logo.svg" alt="canva extension logo: an artboard with a circle, a triangle and a text line, inside a selection frame" width="112"/>

# canva

**Your AI agent makes, edits and exports your Canva designs.**<br/>
Through Canva's official remote MCP server, signed in with your own Canva account: nothing to install.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Remote MCP server](https://img.shields.io/badge/MCP-remote%20server-6272de)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Canva's MCP server](https://www.canva.dev/docs/mcp/)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, [Canva's official remote MCP server](https://www.canva.dev/docs/mcp/) and what to do with it: finding your designs, creating presentations, posters, infographics and worksheets from a description, editing their texts, images and pages, generating images, using your brand kit, and exporting to PDF, PNG, PPTX or MP4. It signs in with your Canva account (Canva for Education is free for teachers) and works in it, asking before it creates, changes or posts anything. It knows Canva, not teaching: an agent that knows how to teach, like [miyagi](https://github.com/falkenslab/miyagi), installs it to make the materials of a class. It's made by Falken's Lab, not by Canva.

## ✨ Why this extension

- 🧩 **Nothing to install.** Canva's server runs at Canva; the extension only tells the agent where it is and how to use it.
- 🔐 **Your account, your sign-in.** You sign in to Canva in your browser; the agent never sees your password.
- 🎚️ **Asks before it changes.** Reads go straight away; creating, editing, posting a comment or publishing a template waits for your yes, and plan mode lets only the reads through.
- 🕶️ **Other people's data stays out.** Students' names, class lists or photos never go to Canva without your explicit yes.
- 🧭 **Knows your plan.** On Free it says what needs another plan (brand kits, resizing, Pro quality) and offers what Free allows.
- 🤖 **Capabilities, not a brand.** Its capabilities (`design-create`, `design-export`…) are neutral, so an agent's skills depend on what can be done.

## 🚀 Quick start

You need a Canva account and an agent on agent-kit 0.25 or later, or Claude Code 2.1.271 or later.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add canva@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install canva@falkenslab
```

Then sign in: in an agent's chat, `/extensions sign-in canva` gives you the link to open (while the full-screen chat splits it, [agent-kit#72](https://github.com/falkenslab/agent-kit/issues/72), open the chat with `--plain` to copy it whole); in Claude Code, `/mcp`. A new session doesn't ask again. Then ask: "What are my last five Canva designs?"

Not checked in Codex yet.

## 💬 What you can ask

- 👩‍🏫 "Make a 10-slide presentation introducing photosynthesis for 12-year-olds, in Spanish."
- 👩‍🏫 "Turn this outline into a one-page worksheet, and export it as a PDF to print."
- 👩‍🏫 "Make an infographic of the water cycle in my school's brand kit."
- 🧑‍💻 "Find my poster for the science fair and change the date to 14 November."
- 🧑‍💻 "Remove the background of the photo on page 2."
- 🧑‍🎓 "Export my project's presentation as PPTX so I can present it in class."

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `https://mcp.canva.com/mcp`, Canva's official remote MCP server, behind Canva's OAuth sign-in |
| 🎨 `designs` | Finding, creating, copying, resizing, importing and editing designs, folders and comments, and what Canva imposes |
| 🖼️ `images` | Generating and editing images, removing backgrounds, separating layers and bringing files into Canva |
| 🏷️ `brand` | Brand kits and brand templates, and what to offer on a plan without them |
| 📤 `export` | Which format for which use, the Free plan's quality, premium elements, and keeping the file before the link expires |
| 🕶️ `what-goes-to-canva` | What never goes to Canva without your yes: other people's personal data |

## 📚 Documentation

- **[Canva's MCP server](https://www.canva.dev/docs/mcp/)**: what it is and how it's run, by Canva.
- **[Its tools and rate limits](https://www.canva.dev/docs/mcp/tools/)**: every tool, the plans that have it and its limits.
- **[Installing extensions](https://falkenslab.github.io/agent-kit/docs/extensions/installing)**: in an agent built on agent-kit, and signing in to a remote server.

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (agent-kit's data in `metadata["agent-kit"]`, with the tools that only read in `readOnlyTools`), `.mcp.json` with the remote server, and `skills/`. To try a change, link it into an agent instead of installing it (`my-agent extension add ./extensions/canva --link`), and check it with `claude plugin validate --strict extensions/canva`. How agent-kit runs a remote server: [A remote server](https://falkenslab.github.io/agent-kit/docs/extensions/writing#a-remote-server).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
