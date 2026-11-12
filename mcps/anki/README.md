# anki-mcp

An MCP server that writes and reads Anki decks (`.apkg`): basic, both-ways and cloze cards with tags, images and audio, and subdecks. Exported again, a deck updates its notes in Anki instead of duplicating them. It's the server of Falken's Lab's [anki extension](https://github.com/falkenslab/agent-extensions/tree/main/extensions/anki), which adds its skill and how an agent uses it well.

## 🚀 Running it

`npx -y @falkenslab/anki-mcp` starts it over stdio, with no settings and nothing to install: one file, pure JavaScript, no network. Its tools: `write_deck`, `add_to_deck`, `read_deck`, `server_info`.

## 🛠️ Developing

It writes Anki's legacy collection (`collection.anki2`, schema 11), which every Anki version imports, with [sql.js](https://github.com/sql-js/sql.js) (its WebAssembly inlined in the bundle, about 1.7 MB) and zips it with [fflate](https://github.com/101arrowz/fflate). `npm test` writes decks and reads them back with sql.js, with media and cloze, and lists the built server's tools.

In this folder, `npm install`, `npm run build` (one file, `dist/server.mjs`, with esbuild) and `npm test`. Until the extension runs the server from npm, the build also copies it into [`extensions/anki/dist/`](../../extensions/anki/dist/), which is committed. `npm publish` builds and tests it first; the version goes up together in `package.json`, the server's `VERSION` and the extension's `plugin.json`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
