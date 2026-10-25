<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/h5p/assets/logo.svg" alt="h5p extension logo: an interactive card with a question and three answers, one ticked" width="112"/>

# h5p

**Your AI agent writes interactive H5P content, as a package ready to upload.**<br/>
Multiple choice, true/false, fill in the blanks, drag the words, cards, question sets and course presentations, checked on your computer before they're written, through h5p-mcp.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![npm](https://img.shields.io/npm/v/@falkenslab/h5p-mcp?label=h5p-mcp&color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/h5p-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 h5p-mcp's documentation](https://falkenslab.github.io/h5p-mcp/)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), Claude Code or Codex the [h5p-mcp](https://github.com/falkenslab/h5p-mcp) server and what to do with it: turning the questions, gap texts, cards or slides it writes with you into an `.h5p` package on your computer, checked against its content type before it's written, in your language, with a preview to review it; and reading an existing package to review or change it. The packages carry only their content, not H5P's code, so they're small and play on any site that has the content type, such as a Moodle with its H5P activity. It uploads nothing: in Moodle, the [moodle-teacher](../moodle-teacher/) extension does. It knows H5P, not teaching: an agent that knows how to teach, like [miyagi](https://github.com/falkenslab/miyagi), installs it to make a class's self-checks. It runs h5p-mcp from npm, at a fixed version.

## ✨ Why this extension

- 📦 **Packages a site takes.** The format Moodle validates and deploys, tried on a real site.
- ✅ **Checked before it's written.** A question without its right answer, or a blank without its word, is refused with what to fix, by the rules the site applies.
- 🌍 **In your language.** Buttons and messages come in the content's language, from each type's own translations.
- 👀 **Reviewed before uploading.** A plain preview of the questions, the right answers and the cards, without H5P's player.
- 🔁 **Read back.** An existing package's content, in the same shape, to change it and build it again.
- 🪶 **Nothing to install.** One bundled server run with `npx`; no H5P code on your computer.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit, Claude Code 2.1.271 or later, or Codex.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add h5p@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install h5p@falkenslab
```

It needs no settings. Then ask: "Make me a five-question multiple choice on the water cycle, as an H5P package in my Downloads folder." Codex installs it too (`codex plugin marketplace add falkenslab/agent-extensions`, then `codex plugin add h5p@falkenslab`).

## 💬 What you can ask

- 👩‍🏫 "Make a ten-question quiz on HTML5 semantics as an H5P Question Set, in Spanish."
- 👩‍🏫 "Turn these vocabulary pairs into Dialog Cards."
- 👩‍🏫 "Write a fill-in-the-blanks text about the parts of a cell, and show me the preview."
- 👩‍🏫 "Read this .h5p and add two harder questions to it."
- 👩‍🏫 "Upload the package to unit 3 of my course, hidden." (with moodle-teacher)

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/h5p-mcp@0.1.0`: `list_h5p_types`, `build_h5p`, `read_h5p` |
| 🧩 `h5p-packages` | Which type for what, writing the content in each type's shape and syntax, building and checking it, the preview, reading a package back, and handing it over for upload |

## 📚 Documentation

- **[h5p-mcp's documentation](https://falkenslab.github.io/h5p-mcp/)**: the server and its settings.
- **[Building packages](https://falkenslab.github.io/h5p-mcp/packages)**: the content types, what is checked, languages and what isn't supported yet.
- **[h5p-mcp's tools](https://falkenslab.github.io/h5p-mcp/reference/tools)**: every tool, with the description the agent reads.

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (agent-kit's data in `metadata["agent-kit"]`), `.mcp.json` and `skills/`. To try a change, link it into an agent instead of installing it (`my-agent extension add ./extensions/h5p --link`), and check it with `claude plugin validate --strict extensions/h5p`. How agent-kit runs it: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
