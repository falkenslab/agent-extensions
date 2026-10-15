<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/moodle-mcp/main/docs/static/img/logo.svg" alt="moodle-mcp logo: the m of Moodle plugged into a socket" width="112"/>

# moodle

**Your AI agent works in your Moodle courses as you, and knows how to do it well.**<br/>
moodle-mcp's 140 tools, with the good practice to build, grade, follow and reuse your courses.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 5.x](https://img.shields.io/badge/Moodle-5.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../LICENSE)

**[📖 moodle-mcp's documentation](https://falkenslab.github.io/moodle-mcp/)** · [📖 Documentación en español](https://falkenslab.github.io/moodle-mcp/es/)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, the [moodle-mcp](https://github.com/falkenslab/moodle-mcp) server and what to do with it: skills for everything a course holds (content, assignments, quizzes, forums, other activities, the gradebook), for grading, following the class and checking a course, for publishing safely and for reusing courses across sites, and commands for a quick look at what's due. It knows Moodle, not teaching: an agent that knows teaching, like [miyagi](https://github.com/falkenslab/miyagi), installs it to work in Moodle. It runs moodle-mcp from npm, at a fixed version, through a real browser on your computer, logged in as you.

## ✨ Why this extension

- 🧭 **Good practice, not only tools.** Its skills say which tool to use for each job, in what order, and what to check afterwards.
- 🔐 **Your login, never your password.** You log in yourself, in a browser window moodle-mcp opens.
- 🕶️ **Students stay anonymous.** They reach the agent as aliases, unless you choose otherwise.
- 🎚️ **You set the limits when you install it.** A teacher's or a student's tools, read-only access, how others' data arrives.
- ✋ **It asks before changing things.** In plan mode it only reads; otherwise it confirms each change with you.
- 🌐 **Several Moodle sites.** Your school's and your university's, and course content copied between them.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit 0.22 or later, or Claude Code 2.1.271 or later.

```bash
# An agent built on agent-kit (its own command; Captain Whiskers': npm start --)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle@falkenslab
```

Both ask for its settings when you install it: your Moodle sites (`name=address`, e.g. `school=https://campus.myschool.org`), and the optional ones below. The first time it works on a site, a browser window opens for you to log in.

## ⚙️ Settings

| Setting | What it does | Default |
| --- | --- | --- |
| `sites` | Your Moodle sites, `name=address` each; the first is where it starts | required |
| `headless` | The browser works out of sight (a window opens to log in, or when you ask to watch) | yes |
| `role` | Only a teacher's tools (`teacher`), only a student's (`student`), or all | `all` |
| `access` | `read`: only look, never change anything | `write` |
| `student_data` | `pseudonymize` (aliases), `block` (none) or `clear` (names: only for an AI on your own computer) | `pseudonymize` |

Change them later with `my-agent extension config moodle`, in the chat with `/extensions config moodle`, from a desktop agent's extension settings, or in Claude Code's `/plugin`. Sites you add later by asking ("add my university's Moodle") are kept by moodle-mcp, apart from these.

## 💬 What you can ask

- 👩‍🏫 "Grade the essays of unit 3 with their rubric, and show me the proposals first."
- 👩‍🏫 "Make a 10-question quiz on fractions from the course's question bank."
- 👩‍🏫 "Copy last year's unit 2 from my old school's Moodle into this year's course."
- 👩‍🏫 "Who's falling behind in unit 3, and on which activity?"
- 👩‍🏫 "Check the course is ready for the new term: dates, locked activities, the gradebook."
- 👩‍🏫 "/moodle:to-grade" or "/moodle:week": what's waiting, and what's due.
- 🧑‍🎓 "What do I have to hand in this week?"

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/moodle-mcp@0.3.0`, with your settings |
| 🔎 `read-a-course` | What the person can do in a course, its structure, restrictions, completion and dates |
| 🫥 `publishing` | New content hidden first, checked, then shown; one approval per item |
| 📄 `course-content` | Pages, books, files, folders, links and section texts, as HTML Moodle keeps |
| 📤 `assignments` | Submission settings that match the statement, dates, groups, feedback and the rubric |
| 📝 `quizzes` | Settings for the quiz's purpose, GIFT that imports well, slots, order and total |
| 🧩 `other-activities` | Workshop, lesson, glossary, wiki, forums, choice, H5P; completion, restrictions and groups |
| 💬 `forums` | Reading threads, posting exactly once, announcements and moderation |
| ✅ `grading` | Assignments with their rubric, quiz essays and graded forums, proposals first |
| 🧮 `gradebook` | Categories, aggregation and weights that compute the grading scheme |
| 📈 `class-progress` | Completion, grades, submissions and activity, and writing to who's behind |
| 🩺 `course-check` | What's broken or stale in a course, and getting it ready for a new term |
| 🎮 `scorm` | An HTML activity packaged as SCORM, uploaded and tested so Moodle records it |
| 📦 `copy-and-restore` | Copying, importing, backing up and restoring courses, and checking the result |
| 🌐 `several-sites` | Adding and switching sites, and copying between them |
| 📅 `/moodle:week` | What's due this week and what's waiting for you |
| 🗂️ `/moodle:to-grade` | What's waiting to be graded, course by course |

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (its settings in `userConfig`, agent-kit's data in `metadata["agent-kit"]`), `.mcp.json`, `skills/` and `commands/`. To try a change, link it into an agent instead of installing it (`my-agent extension add ./moodle --link`), and check it with `claude plugin validate --strict moodle`. How agent-kit runs it: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/next/capabilities/extensions).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
