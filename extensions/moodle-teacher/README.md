<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/moodle-mcp/main/docs/static/img/logo.svg" alt="moodle-mcp logo: the m of Moodle plugged into a socket" width="112"/>

# moodle-teacher

**Your AI agent works in the Moodle courses you teach, as you, and knows how to do it well.**<br/>
moodle-mcp's teacher tools, with the good practice to build, grade, follow and reuse your courses.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 4.5 and 5.x](https://img.shields.io/badge/Moodle-4.5%20%7C%205.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 moodle-mcp's documentation](https://falkenslab.github.io/moodle-mcp/)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension, for teachers, gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, the [moodle-mcp](https://github.com/falkenslab/moodle-mcp) server and what to do with it: skills for everything a course holds (content, assignments, quizzes, forums, other activities, the gradebook), for grading, following the class and checking a course, for publishing safely and for reusing courses across sites, and skills for a quick look at what's due. It knows Moodle, not teaching: an agent that knows teaching, like [miyagi](https://github.com/falkenslab/miyagi), installs it to work in Moodle. For the courses you take as a student, there is [moodle-student](../moodle-student/). It runs moodle-mcp from npm, at a fixed version, through a real browser on your computer, logged in as you.

## ✨ Why this extension

- 🧭 **Good practice, not only tools.** Its skills say which tool to use for each job, in what order, and what to check afterwards.
- 🔐 **Your login, never your password.** You log in yourself, in a browser window moodle-mcp opens.
- 🕶️ **Students stay anonymous.** They reach the agent as aliases, unless you choose otherwise.
- 🎚️ **You set the limits when you install it.** Read-only access, and how students' data arrives.
- ✋ **It asks before changing things.** In plan mode it only reads; otherwise it confirms each change with you.
- 🌐 **Several Moodle sites.** Your school's and your university's, and course content copied between them.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit 0.22 or later, or Claude Code 2.1.271 or later.

```bash
# An agent built on agent-kit (its own command; Captain Whiskers': npm start --)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add moodle-teacher@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install moodle-teacher@falkenslab
```

Both ask for its settings when you install it: your Moodle sites (`name=address`, e.g. `school=https://campus.myschool.org`), and the optional ones below. The first time it works on a site, a browser window opens for you to log in.

Codex installs it too (`codex plugin marketplace add falkenslab/agent-extensions`, then `codex plugin add moodle-teacher@falkenslab`), with its skills and server. Codex has no plugin settings, so the first time the agent asks you for your Moodle site's address in the chat. Codex keeps one server per name and both Moodle extensions call theirs `moodle`, so enable only one of `moodle-teacher` and `moodle-student` there.

## ⚙️ Settings

| Setting | What it does | Default |
| --- | --- | --- |
| `sites` | Your Moodle sites, `name=address` each; the first is where it starts | required |
| `courses` | Only these courses (your classrooms), by their URLs: any other is refused | every course |
| `headless` | The browser works out of sight (a window opens to log in, or when you ask to watch) | yes |
| `access` | `read`: only look, never change anything | `write` |
| `student_data` | `pseudonymize` (aliases), `block` (none) or `clear` (names: only for an AI on your own computer) | `pseudonymize` |

Change them later with `my-agent extension config moodle-teacher`, in the chat with `/extensions config moodle-teacher`, from a desktop agent's extension settings, or in Claude Code's `/plugin`. Sites you add later by asking ("add my university's Moodle") are kept by moodle-mcp, apart from these.

## 💬 What you can ask

- 👩‍🏫 "Grade the essays of unit 3 with their rubric, and show me the proposals first."
- 👩‍🏫 "Make a 10-question quiz on fractions from the course's question bank."
- 👩‍🏫 "Copy last year's unit 2 from my old school's Moodle into this year's course."
- 👩‍🏫 "Who's falling behind in unit 3, and on which activity?"
- 👩‍🏫 "Check the course is ready for the new term: dates, locked activities, the gradebook."
- 👩‍🏫 "/moodle-teacher:to-grade" or "/moodle-teacher:week": what's waiting, and what's due.

## 📸 See it at work

<p align="center">
<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/moodle-teacher/assets/screenshot.png" alt="A Moodle assignment's rubric, ready for use, that the agent defined with set_rubric" width="760"/>
</p>

<p align="center"><em>In moodle-sandbox: the rubric Claude Code defined for a new assignment, after drafting it and asking first.</em></p>

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/moodle-mcp@0.6.0`, with your settings |
| 🔎 `read-a-course` | What the person can do in a course, its structure, restrictions, completion and dates |
| 🫥 `publishing` | New content hidden first, checked, then shown; one approval per item |
| 📄 `course-content` | Pages, books with their chapters, files, folders, links and section texts, as HTML checked before Moodle gets it, and the course calendar |
| 📤 `assignments` | Submission settings that match the statement, dates, groups, feedback, and its rubric or marking guide |
| 📝 `quizzes` | Settings for the quiz's purpose, GIFT checked before importing, banks exported to reuse, slots, order and total |
| 🧩 `other-activities` | Workshop and its allocation, lesson pages and jumps, database, glossary, wiki, feedback, forums, choice, H5P; completion, restrictions, groups and badges |
| 💬 `forums` | Reading threads, posting exactly once, announcements and moderation |
| ✅ `grading` | Assignments with their rubric, quiz essays and graded forums, proposals first |
| 🧮 `gradebook` | Categories, aggregation and weights that compute the grading scheme |
| 📈 `class-progress` | Completion, grades, submissions and activity, and writing to who's behind |
| 🩺 `course-check` | What's broken or stale in a course, getting it ready for a new term, and what completes it |
| 👥 `participants-and-groups` | Enrolling people and their roles, how the course lets people in, and making and filling groups |
| 🎮 `scorm` | An HTML activity packaged as SCORM, uploaded and tested so Moodle records it |
| 📦 `copy-and-restore` | Copying, importing, backing up and restoring courses, and checking the result |
| 🌐 `several-sites` | Adding and switching sites, and copying between them |
| 📅 `week` | What's due this week and what's waiting for you (in Claude Code, also `/moodle-teacher:week`) |
| 🗂️ `to-grade` | What's waiting to be graded, course by course (in Claude Code, also `/moodle-teacher:to-grade`) |

## 📚 Documentation

- **[moodle-mcp's documentation](https://falkenslab.github.io/moodle-mcp/)**: what the server does, logging in, privacy and limits.
- **[moodle-mcp's tools](https://falkenslab.github.io/moodle-mcp/reference/tools)**: every tool, with the roles that have it.
- **[Installing extensions](https://falkenslab.github.io/agent-kit/docs/extensions/installing)**: in an agent built on agent-kit.

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (its settings in `userConfig`, agent-kit's data in `metadata["agent-kit"]`), `.mcp.json` and `skills/`. To try a change, link it into an agent instead of installing it (`my-agent extension add ./extensions/moodle-teacher --link`), and check it with `claude plugin validate --strict extensions/moodle-teacher`. How agent-kit runs it: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
