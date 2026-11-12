<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/anki/assets/logo.svg" alt="anki extension logo: two flashcards, the front one with a question, a dividing line and its answer" width="112"/>

# anki

**Your AI agent turns what you study into an Anki deck, ready to import.**<br/>
Flashcards one way, both ways or with gaps to fill, with tags, images and audio, written as an `.apkg` on your computer that updates the deck when it's exported again.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit) or Claude Code its own small MCP server and what to do with it: turning the cards it writes with you into an Anki deck, an `.apkg` file on your computer that [Anki](https://apps.ankiweb.net), AnkiDroid and AnkiMobile import; adding cards to a deck's export; and reading an `.apkg` to review or extend it. Exporting the same deck again updates its cards in Anki instead of duplicating them, and keeps your progress on them. It uploads and syncs nothing: you import the file. It knows Anki's format, not how to study: an agent that does, like [padawan](https://github.com/falkenslab/padawan) for a student's own review or [miyagi](https://github.com/falkenslab/miyagi) to hand a class a deck, installs it. Its server comes bundled in the extension, as one file, with nothing to install.

## ✨ Why this extension

- 🃏 **The three note types that matter.** Front and back, both ways, and cloze (`{{c1::…}}` gaps, one card per number), each with an optional extra under the answer.
- 🔁 **Exported again, updated.** Notes get ids from the deck and their front, so a corrected deck updates your cards in Anki, with your progress, rather than adding copies.
- ➕ **Add to a deck.** A deck's `.apkg` with more cards, keeping its notes, ids and media.
- 🖼️ **Images and audio.** Files from your computer, referenced in the cards, packed into the deck.
- ✅ **Checked before it's written.** A cloze without a gap, a missing image, a duplicate front or a script in a field is refused with what to fix; nothing is written over without your yes.
- 🪶 **Nothing to install.** One bundled server, no native code and no network: it works offline.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, an agent on agent-kit or Claude Code, and Anki (desktop, AnkiDroid or AnkiMobile) to study the deck.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add anki@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install anki@falkenslab
```

It needs no settings. Then ask: "Make me an Anki deck with the twenty irregular verbs we went through, in my Downloads folder." Import the file in Anki with File > Import, or by opening it on your phone. Codex installs it too (`codex plugin marketplace add falkenslab/agent-extensions`, then `codex plugin add anki@falkenslab`), but there its skill loads and its server doesn't start: Codex doesn't expand `${CLAUDE_PLUGIN_ROOT}`, the extension's folder, in `.mcp.json`.

## 💬 What you can ask

- 🎓 "Turn my notes on the French Revolution into Anki cards, one fact each."
- 🎓 "Make cloze cards from these definitions, and tag them by unit."
- 🎓 "A deck of Spanish–English vocabulary, both ways, with the audio files in this folder."
- 🎓 "I fixed three answers: export the deck again so Anki updates it."
- 👩‍🏫 "Add these ten cards to the deck in biology.apkg for my students."
- 🎓 "What's in this .apkg?"

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `node ${CLAUDE_PLUGIN_ROOT}/dist/server.mjs`, bundled (about 1.7 MB): `write_deck`, `add_to_deck`, `read_deck`, `server_info` |
| 🧩 `anki-decks` | Which note type when, the HTML fields take, cloze syntax, tags, media, deck names and subdecks, exporting again to update, adding to a deck, where to save it and how to import it |

## 📚 Documentation

- **[Anki's manual](https://docs.ankiweb.net)**: importing, note types, cloze deletions and studying.
- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)**: how agent-kit runs an extension with its own server.

## 🛠️ Developing

The server's code is in [`mcps/anki/`](../../mcps/anki/), which goes to npm as `@falkenslab/anki-mcp`; there `npm install`, `npm run build` and `npm test` build and test it, and the build copies it into this extension's `dist/server.mjs`, which is committed until the extension runs it from npm. To try a change, link the extension into an agent (`my-agent extension add ./extensions/anki --link`) and check it with `claude plugin validate --strict extensions/anki`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
