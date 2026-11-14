<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/asker/assets/logo.svg" alt="asker-mcp logo" width="112"/>

# asker-mcp

**Your AI agent runs Asker on your definitions, and reviews its questions with you.**<br/>
A definitions file checked, quiz questions generated from it as Moodle XML or GIFT, read back for review and filtered before importing.

![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
[![npm](https://img.shields.io/npm/v/@falkenslab/asker-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/asker-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

</div>

asker-mcp is an MCP server that drives [Asker](https://github.com/teuton-software/asker), which makes many quiz questions from a definitions file (concepts with names, tags and definitions, tables, sequences, problems and code). It checks a file, generates its questions into a folder on your computer, reads them back by concept and type for a review, and writes a copy without the ones left out, ready for Moodle's import. It uploads nothing: in Moodle, the moodle-teacher extension does that. It's the server of Falken's Lab's [asker extension](../../extensions/asker/), whose skills say how an agent uses it well.

## ✨ Why asker-mcp

- 📝 **The definitions are the source.** Asker runs on the teacher's file as it is; the server never writes or rewrites a question's text, and the skills never add content the teacher didn't give.
- ✅ **Checked as data, in plain words.** Hints with their line before Asker runs (invisible characters, tabs, odd indentation, an empty `%def`, files and links that won't load, a `%map` without `lang` or `context`, XML that isn't well formed), `asker check`'s complaints, a trial run for what only shows loading, Asker's messages explained, and how many questions each concept would make.
- 👀 **Reviewed before importing.** Every question with its answers and its Asker template, by concept, kind, type or template, a page at a time; a copy without the rejected ones, the original untouched.
- 🧩 **Asker's quirks handled, and Moodle's.** Tested on all of dvarrui/asker-inputs (129 inputs, 33,000 questions) and by importing into Moodle 5.2; see below.
- 🔒 **Offline.** Asker runs from a folder with the server's own `asker.ini`, internet always off.

## 🚀 Quick start

With [Node.js](https://nodejs.org) 20 or later, [Ruby](https://www.ruby-lang.org) 3.0 or later and `gem install asker-tool --no-document`, add it to Claude Code:

```bash
claude mcp add asker-mcp -- npx -y @falkenslab/asker-mcp
```

Then ask for questions from your notes. In an agent built on agent-kit, or in Claude Code with its skills, install the [asker extension](../../extensions/asker/) instead.

## 🧰 What's inside

| Tool | What it does |
| --- | --- |
| `asker_input_reference` | Asker's input language in short, with an example per element (read-only) |
| `check_input` | Hints with their lines, Asker's syntax check, and a trial run: errors explained, warnings, questions per concept, those that would make none, other files in the folder (read-only) |
| `generate_questions` | Asker on one or more files or a folder, into another folder: Moodle XML, GIFT, the review sheet; question types, category, penalties, exclusions, drag-and-drop matching |
| `read_questions` | A Moodle XML file's questions with their answers and Asker templates, by concept, kind, type or template, a page at a time (read-only) |
| `exclude_questions` | A copy of a Moodle XML or GIFT file without the questions given, by name or type |
| `check_requirements` | Ruby and Asker, their versions and how to install them (read-only) |
| `server_info` | The server's version and the Ruby and Asker it uses (read-only) |

## 📝 The definitions are the source

Asker generates many questions from a definitions file with fixed templates: they're as right as the definitions and as good as the templates, and a teacher keeps their files over years. An agent could write questions directly; what Asker adds is questions traced to the teacher's own definitions, many of them, the same way every time. So the teacher's file is the source of truth: the agent may draft one from the teacher's notes, the teacher reviews it before questions come from it, `generate_questions` runs Asker as it is and never rewrites a question, and reviewing is part of the flow (`read_questions`, then `exclude_questions`), so no question reaches a course that the teacher hasn't seen.

## ⚙️ How it runs Asker

- Asker runs as `ruby -e "load Gem.bin_path('asker-tool', 'asker')"`, the same on every system: on Windows its command is a `.bat`, and a gem installed with `--user-install` or into Homebrew's Ruby leaves it off the `PATH`. Ruby is found through `ASKER_MCP_RUBY`, the `PATH`, or RubyInstaller's folders on Windows, for an app started before Ruby was installed.
- Each run is in a temporary folder with the server's `asker.ini` (Asker reads it from where it runs): internet and colours off, Moodle XML and GIFT always written, the options asked for. The files asked for are copied to the person's folder; nothing is written over without `overwrite`.
- Asker reads every `.haml` and `.xml` next to an input (their concepts give it wrong answers) and generates only from the input itself, so `check_input` lists them. A file there that isn't an Asker input stops it ("Unknown Lang"), so it's named before Asker runs, and the Moodle XML is never written next to an input, or the next run would take it for one.
- Question names say where each comes from and Asker's template ("router-12-t5table", "first2-30-07ps3short", "greet.py-4-code1ok"): that's how questions are grouped and counted, checked against Asker's own tables.

## 🩹 Asker's and Moodle's quirks

Found testing every input in [dvarrui/asker-inputs](https://github.com/dvarrui/asker-inputs) through the built server, and importing into [moodle-sandbox](https://github.com/falkenslab/moodle-sandbox)'s Moodle 5.2 with moodle-driver (what moodle-teacher's `import_questions` runs):

- **`asker check` flags lines Asker ignores**: `%tags` and `%def` in a `%code` mean nothing there (60 of the 129 inputs have them); Asker skips them and generates, while `asker check` refuses the file. `check_input` always makes a trial run: its `ok` says whether Asker reads the file, and `syntax` the lines to fix anyway ([teuton-software/asker#30](https://github.com/teuton-software/asker/issues/30)).
- **Ordering questions don't import into Moodle 4.4 and later**: Asker writes them without `<shownumcorrect/>`, and Moodle's ordering type then fails to save them ("Error writing to database"). The server adds it.
- **Unescaped text**: Asker writes an answer like `mysql -u root < data.sql` into a `<text>` without CDATA, which leaves the XML unreadable. The server escapes `<`, `>` and `&` there, with the same text.
- **GIFT**: Asker can't write drag-and-drop matching there, and its warning comments out the next question's first line; it also skips questions with embedded files. The server removes the broken blocks, restores the next question, and says what GIFT lacks.
- **The category** is written only into GIFT; the server adds it to the Moodle XML.
- **`fractions = 0`**, as Asker's own `asker.ini` suggests, crashes it; the server quotes its values.
- **`[languages] default`** is never used for a `%map` without `lang`, which stops Asker: so there's no language option, and `check_input` asks for `lang` (and `context`, which Asker also needs).
- **Messages that mislead**: a byte-order mark shows as "Remove spaces before %map", an empty `%def` as "Write 4 spaces before %def", a share-page link as "Unknown URL type", an empty file as a Ruby crash. `check_input`'s hints and `explained` say what each really is.

## 🛠️ Developing

In this folder: `npm install`, then `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (one file, `dist/server.mjs`, with esbuild) and `npm run check` (the built server's tools, complete). The tests run the tools with a fake `asker` that answers as the real one did on `test/fixtures/inputs/` (captured in `test/fixtures/runs/` by `npx tsx scripts/capture-fixtures.mjs`, run again only when Asker changes), and with the real Asker when it's installed (`ASKER_MCP_REAL_TESTS=required` makes them compulsory, as in CI). The inputs are our own: Asker's examples are GPL. `npm publish` runs all of them first; releases are published to npm by the owner. It was planned in its own repository, falkenslab/asker-mcp, and moved here before any code was written (November 2026).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
