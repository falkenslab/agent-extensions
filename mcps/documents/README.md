# documents-mcp

An MCP server that writes a `.docx` in a Word template from Markdown, in the template's own styles, keeping its header, footer and logo and filling its placeholders, and reads a template or a document back. It's the server of Falken's Lab's [documents extension](https://github.com/falkenslab/agent-extensions/tree/main/extensions/documents), which adds its skill and how an agent uses it well.

## 🚀 Running it

`npx -y @falkenslab/documents-mcp` starts it over stdio, with no settings and nothing to install: one file, pure JavaScript, no network. Its tools: `read_template`, `write_docx`, `read_docx`, `server_info`.

## 🛠️ Developing

`src/server.mjs` holds the tools, with `docx.mjs`, `markdown.mjs` and `styles.mjs`, built on [marked](https://marked.js.org) for the Markdown, [fflate](https://github.com/101arrowz/fflate) for the zip and [xmldom](https://github.com/xmldom/xmldom) for the XML. `npm test` writes documents from a template built in the test (localized styles, a header with a logo, split placeholders, a `{{content}}` marker), checks every part and style, converts them to PDF when LibreOffice is installed, and lists the built server's tools.

In this folder, `npm install`, `npm run build` (one file, `dist/server.mjs`, with esbuild) and `npm test`. `npm publish` builds and tests it first; the version goes up together in `package.json` and the server's `VERSION`, and the extension pins it in its `.mcp.json` once it's on npm.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
