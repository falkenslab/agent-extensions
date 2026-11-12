<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/h5p/assets/logo.svg" alt="h5p-mcp logo" width="112"/>

# h5p-mcp

**Your AI agent writes interactive H5P content, as a package ready to upload.**<br/>
Multiple choice, true/false, fill in the blanks, drag the words, cards, question sets and course presentations, built and checked on your computer.

![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
[![npm](https://img.shields.io/npm/v/@falkenslab/h5p-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/h5p-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

</div>

h5p-mcp is an MCP server that turns content an AI agent writes (questions and their answers, cards, slides) into an `.h5p` package on your computer, checked against its content type before it's written, and reads one back to review or reuse it. The packages carry only their content, not H5P's code, so they're small and play on any site that has the content type, such as a Moodle with its H5P activity. It uploads nothing: in Moodle, the moodle-teacher extension does that. It's the server of Falken's Lab's [h5p extension](../../extensions/h5p/), which adds the skill that says how an agent uses it well.

## ✨ Why h5p-mcp

- 📦 **Packages a site takes.** The format Moodle validates and deploys, tried on a real site.
- ✅ **Checked before it's written.** A question without its right answer, or a blank without its word, is refused with what to fix.
- 🔁 **Read back.** An existing package's content, in the same shape, to review it, change it and build it again.
- 👀 **Reviewed before uploading.** A plain preview of the questions, options and cards, without H5P's player.
- 🪶 **Nothing else on your computer.** One bundled file run with `npx`; no H5P code to install or keep up to date.

## 🚀 Quick start

With [Node.js](https://nodejs.org) 20 or later, add it to Claude Code:

```bash
claude mcp add h5p-mcp -- npx -y @falkenslab/h5p-mcp
```

Then ask for an activity. In an agent built on agent-kit, or in Claude Code with its skill, install the [h5p extension](../../extensions/h5p/) instead.

## 💬 What you can ask

👩‍🏫 As a teacher:

- "Make me a ten-question quiz on the water cycle, as an H5P package in my Downloads folder."
- "Turn these vocabulary pairs into Dialog Cards, in Spanish."
- "Read this .h5p and add two harder questions to it."

## 🧰 What's inside

| Area | For example |
| --- | --- |
| 🧩 Content types | `H5P.MultiChoice`, `H5P.TrueFalse`, `H5P.Blanks`, `H5P.DragText`, `H5P.Dialogcards`, `H5P.Flashcards`, `H5P.QuestionSet`, `H5P.CoursePresentation` |
| 🛠️ Tools | `list_h5p_types` (the types and their fields), `build_h5p` (the package and its preview), `read_h5p` (a package's content), `server_info` |
| 🌍 Languages | Buttons and messages in the package's language, from each type's own translations (about fifty languages) |

## 📦 Content-only packages

A package holds `h5p.json` and `content/content.json` (and the media they name under `content/`), never library code. Each content type has a pinned library version (`H5P.MultiChoice 1.16`), the one its fields are checked against, from that library's `semantics.json`, kept here as data with tests; a new version is a deliberate update. So packages are a few kilobytes and no third-party code is shipped, but a package plays only where the site has its content type: installing types is the site administrator's (moodle-mcp's `list_h5p_content_types` lists a Moodle's). Bundling the libraries was rejected: it only helps someone allowed to install libraries, and means vendoring and updating H5P's code.

## 🛠️ Developing

In this folder: `npm install`, then `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (one file, `dist/server.mjs`, with esbuild) and `npm run check` (the built server's tools, complete). `node scripts/fetch-libraries.mjs` refreshes the pinned libraries' semantics and translations. CI builds and tests it with the other servers in `mcps/`. `npm publish` runs all of them first; releases are published to npm by the owner. Until November 2026 it lived in its own repository, [falkenslab/h5p-mcp](https://github.com/falkenslab/h5p-mcp), now archived.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
