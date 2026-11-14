<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/asker/assets/logo.svg" alt="asker extension logo: a sheet of definitions behind a question card with three options, one ticked" width="112"/>

# asker

**Your AI agent turns your own definitions into quiz questions with Asker, reviewed with you before they reach Moodle.**<br/>
A definitions file written from your notes and checked, questions generated from it as Moodle XML or GIFT, and a list to go through, leaving out the ones you don't want.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit) or Claude Code an MCP server that drives [Asker](https://github.com/teuton-software/asker), and what to do with it. Asker makes many quiz questions (true or false, multiple choice, short answer, matching, ordering) from a definitions file: concepts with their names, tags and definitions, tables, sequences, problems and code. The agent drafts that file from your notes, never adding content of its own, and checks it with Asker; Asker generates the questions on your computer, without going online; and you review them with the agent, which writes a copy without the ones you leave out, ready for the [moodle-teacher](../moodle-teacher/) extension to import into a question bank. It knows Asker, and the practices of its author, not how to assess: an agent that does, like [miyagi](https://github.com/falkenslab/miyagi), installs it.

## ✨ Why this extension

- 📝 **Your definitions are the source.** Questions come from the file you reviewed, the same way every time you need more; the agent never writes a question's text.
- ✅ **Checked before it runs, in plain words.** What Asker trips on (spaces, tabs, invisible characters, an empty definition, a link that isn't an image, another file in the folder) with its line, Asker's own messages explained, and how many questions each concept would make.
- 🎛️ **Asker's options, chosen.** Which question types and templates, the question bank category, penalties for wrong answers, questions left out by name.
- 👀 **Reviewed before it reaches a course.** Every question with its answers and its Asker template, a page at a time, a subagent to go through hundreds, and a copy without the ones you reject; the original stays.
- 🧩 **What Moodle takes.** Moodle XML, complete; GIFT on request, with what it can't hold said; drag-and-drop matching only for a Moodle with its plugin.
- 🔒 **Offline.** Asker's image lookup on the internet stays off.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, an agent on agent-kit or Claude Code, and Asker: [Ruby](https://www.ruby-lang.org) 3.0 or later and its gem.

```bash
# Ruby, then Asker (Windows: winget install RubyInstallerTeam.Ruby.3.4; macOS: brew install ruby; Linux: sudo apt install ruby)
gem install asker-tool --no-document

# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add asker@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install asker@falkenslab
```

It needs no settings; restart the app if Ruby was installed while it was open (the agent checks it with `check_requirements`). Then ask: "Make questions with Asker from my notes on network devices, in my Documents/asker folder." Codex installs it too (`codex plugin marketplace add falkenslab/agent-extensions`, then `codex plugin add asker@falkenslab`), and there its skills and server work the same; it has no subagents or hooks.

## 💬 What you can ask

- 👩‍🏫 "Write an Asker file from these notes on the water cycle, and show it to me before generating."
- 👩‍🏫 "Check my definitions file and tell me what Asker doesn't like."
- 👩‍🏫 "Generate only the sequence and matching questions, without the misspelled-word ones, in the category Unit 3."
- 👩‍🏫 "Go through the 400 questions and tell me which ones I should look at."
- 👩‍🏫 "Import the reviewed questions into my course's question bank."

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/asker-mcp@0.1.0`: `asker_input_reference`, `check_input`, `generate_questions`, `read_questions`, `exclude_questions`, `check_requirements`, `server_info` |
| 🧩 `asker-inputs` | Writing a definitions file from the person's notes as Asker reads it and as its author advises (unambiguous definitions, real names, tables that may be shared, true sequences, problems for practical subjects), and checking and refining it |
| 🧩 `asker-questions` | Generating with the right options and output folder, reviewing every question with the person by group and template, leaving out the rejected ones, and importing the rest with moodle-teacher; in miyagi, the button "Questions with Asker" |
| 🧩 `asker-troubleshooting` | What goes wrong and how to fix it: installing, files Asker won't read, other files in the folder, images and links, questions missing or refused |
| 🤖 `input-reviewer` | Subagent: reviews a definitions file against Asker's rules and the person's notes, and returns what to fix (changes nothing) |
| 🤖 `question-reviewer` | Subagent: goes through a generated file and returns the questions to leave out or look at, with the reason (changes nothing) |
| 🪝 Hook | In Claude Code, after a `.haml` is written or edited: a quick look for tabs, invisible characters, odd indentation and empty definitions, and a reminder to run `check_input` |

## 📐 Good practice with Asker

From Asker's documentation and its author's tutorials, which the skills follow:

- **Work on the content, not on the questions.** Asker writes many questions from each line; a better definition or a new table multiplies them.
- **A definition fits one concept only**, in the whole folder, and doesn't name it. What could describe several concepts goes in a table.
- **Names are names**: synonyms, singular and plural, another language's name; two things listed as names are two concepts.
- **Tables are shared facts.** A list item with a note in brackets is two columns; a row with its own definition may be its own concept; `sequence` only when the rows truly go in order.
- **Problems for practical subjects**, with four or more cases.
- **One folder per subject**, with nothing else ending in `.xml` in it; generated questions in a subfolder.
- **Review before importing**, and import the file you reviewed: each run differs.

## 📚 Documentation

- **[Asker's documentation](https://github.com/teuton-software/asker/tree/master/docs)**: its input language, its question templates, and tutorials in Spanish.
- **[dvarrui/asker-inputs](https://github.com/dvarrui/asker-inputs)**: its author's own definitions files by subject, from many years: examples of use, not Asker's reference, and some are out of date.
- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)**: how agent-kit runs an extension and checks what it requires.

## 🛠️ Developing

The server's code is in [`mcps/asker/`](../../mcps/asker/), published to npm as `@falkenslab/asker-mcp`; there `npm install`, `npm run build` and `npm test` build and test it (with the real Asker when it's installed). The extension runs a published version, pinned in `.mcp.json`: a new server is published first, then pinned here. The hook (`hooks/after-edit.mjs`) has no dependencies; try it by piping it a tool call (`{"tool_input":{"file_path":"…/file.haml"}}`). To try a change, link the extension into an agent (`my-agent extension add ./extensions/asker --link`) and check it with `claude plugin validate --strict extensions/asker`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
