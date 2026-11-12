<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/documents/assets/logo.svg" alt="documents extension logo: a page with a heading, lines of text and a small table, its corner folded" width="112"/>

# documents

**Your AI agent writes Word documents in your school's template.**<br/>
A .docx from Markdown in the template's own styles, with its header, footer and logo kept and its fields filled in, on your computer.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), Claude Code or Codex its own small MCP server and what to do with it: turning what it writes with you (a report, a department document, a teaching plan) into a `.docx` in the template your school asks for. The template stays whole, with its styles, page setup, header, footer and logo; the content goes in its body, or where the template marks `{{content}}`, with each heading, list and table in the template's own styles and its `{{fields}}` filled in. The agent reads the template first, and the document back after writing it, before you open it in Word or LibreOffice. It writes nothing over an existing file without your yes, and uploads or sends nothing. It knows Word's format, not what a report should say: an agent that knows how to teach, like [miyagi](https://github.com/falkenslab/miyagi), installs it to write the course's reports in the school's template. Its server is bundled in the extension, in pure JavaScript.

## ✨ Why this extension

- 🏫 **Your template, not a lookalike.** Its styles, fonts, page size, margins, header, footer and logo stay as they are: only the body is written.
- 🔤 **The template's own styles.** Headings, lists, tables, quotes and links take the styles the template defines, found by their names in Word's language (`Título 1` as well as `Heading 1`), or the ones you choose.
- 🧩 **Fields filled in.** `{{course}}`, `{{date}}` or `{{teacher}}` in the body, header or footer get their values, even when Word split them inside.
- 📍 **Around what must stay.** With a `{{content}}` paragraph, the template's cover and signature block stay before and after the document.
- 🔍 **Checked before you open it.** The agent reads the result back: each paragraph's style, the fields left empty, styles missing.
- 🪶 **Nothing to install.** One bundled server, run with Node.js; nothing on the network.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit or Claude Code 2.1.271 or later.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add documents@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install documents@falkenslab
```

It needs no settings. Then ask: "Write the department report as a .docx with the template in my Documents folder." Codex installs it too (`codex plugin marketplace add falkenslab/agent-extensions`, then `codex plugin add documents@falkenslab`), but there only its skill loads: its server runs from the extension's folder (`${CLAUDE_PLUGIN_ROOT}`), which Codex doesn't expand in `.mcp.json`.

## 💬 What you can ask

- 👩‍🏫 "What styles and fields does this template have?"
- 👩‍🏫 "Write the module's annual report in the school's template, with the results table and the chart."
- 👩‍🏫 "Fill the template's course, module and teacher fields, and put the document where it says {{content}}."
- 👩‍🏫 "Use the template's 'Título informe' style for the main headings."
- 👩‍🏫 "Read the .docx back and tell me if anything was left unfilled."

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `dist/server.mjs`, bundled in the extension: `read_template`, `write_docx`, `read_docx`, `server_info` |
| 🧩 `docx-from-template` | Reading the template first, writing the Markdown for its styles, placeholders and images, saving without overwriting, and checking the result before the person reviews it |

## 📚 Documentation

- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)**: how agent-kit runs an extension with its own bundled server, like this one.
- **[The extensions reference](https://falkenslab.github.io/agent-kit/docs/extensions/reference)**: every field of the manifest and of `metadata["agent-kit"]`.
- **[Office Open XML](https://learn.microsoft.com/office/open-xml/word/overview)**: the format of a `.docx`.

## 🛠️ Developing

The server's source is `src/` (`server.mjs` with the tools, `docx.mjs`, `markdown.mjs` and `styles.mjs`), built on the MCP SDK, [marked](https://marked.js.org) for the Markdown, [fflate](https://github.com/101arrowz/fflate) for the zip and [xmldom](https://github.com/xmldom/xmldom) for the XML. `npm install` then `npm run build` writes `dist/server.mjs` (about 920 KB, one file), which is committed: the kit installs files and never runs `npm install`, and `node_modules/` stays out. `npm test` writes documents from a template built in the test (localized styles, a header with a logo, split placeholders, a `{{content}}` marker), checks every part and style, converts them to PDF when LibreOffice is installed, and lists the built server's tools. To try a change, link the extension into an agent (`my-agent extension add ./extensions/documents --link`) and check it with `claude plugin validate --strict extensions/documents`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
