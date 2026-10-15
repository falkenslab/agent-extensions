<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/moodle-mcp/main/docs/static/img/logo.svg" alt="moodle-mcp logo: the m of Moodle plugged into a socket" width="112"/>

# moodle-student

**Your AI agent helps in the Moodle courses you take, as you, and knows how to do it well.**<br/>
moodle-mcp's student tools, with the good practice to plan, hand in, take quizzes and learn from feedback.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 5.x](https://img.shields.io/badge/Moodle-5.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../LICENSE)

**[📖 moodle-mcp's documentation](https://falkenslab.github.io/moodle-mcp/)** · [📖 Documentación en español](https://falkenslab.github.io/moodle-mcp/es/)

</div>

This extension, for students, gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, the [moodle-mcp](https://github.com/falkenslab/moodle-mcp) server with a student's tools and what to do with them: skills for reading a course, planning what's left, handing in assignments, taking quizzes, the forums and the other activities, and reading grades and feedback, and a command for what's due this week. It knows Moodle, not studying: an agent that knows how to learn, like [padawan](https://github.com/falkenslab/padawan), installs it to work in Moodle. For the courses you teach, there is [moodle-teacher](../moodle-teacher/). It runs moodle-mcp from npm, at a fixed version, through a real browser on your computer, logged in as you.

## ✨ Why this extension

- 🧭 **Good practice, not only tools.** Its skills say how each activity works in Moodle, what's final and what to check afterwards.
- ✋ **Nothing final without you.** Starting a quiz attempt, submitting an assignment, accepting a submission statement or posting in a forum waits for your yes.
- 🔐 **Your login, never your password.** You log in yourself, in a browser window moodle-mcp opens.
- 🕶️ **Others stay anonymous.** Classmates and teachers reach the agent as aliases, unless you choose otherwise.
- 🎚️ **You set the limits when you install it.** Read-only access, and how others' data arrives.
- 🌐 **Several Moodle sites.** Your school's, your university's and a training platform, kept apart.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit 0.22 or later, or Claude Code 2.1.271 or later.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle-student@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle-student@falkenslab
```

Both ask for its settings when you install it: your Moodle sites (`name=address`, e.g. `school=https://campus.myschool.org`), and the optional ones below. The first time it works on a site, a browser window opens for you to log in.

## ⚙️ Settings

| Setting | What it does | Default |
| --- | --- | --- |
| `sites` | Your Moodle sites, `name=address` each; the first is where it starts | required |
| `headless` | The browser works out of sight (a window opens to log in, or when you ask to watch) | yes |
| `access` | `read`: only look, never hand in, answer or post | `write` |
| `student_data` | `pseudonymize` (aliases), `block` (none) or `clear` (names: only for an AI on your own computer) | `pseudonymize` |

Change them later with `my-agent extension config moodle-student`, in the chat with `/extensions config moodle-student`, from a desktop agent's extension settings, or in Claude Code's `/plugin`.

## 💬 What you can ask

- 🧑‍🎓 "What do I have to hand in this week, and what should I do first?"
- 🧑‍🎓 "Upload my report.pdf to the unit 2 assignment, and show me before submitting it."
- 🧑‍🎓 "How many attempts does the unit 1 quiz have, and is there a time limit?"
- 🧑‍🎓 "Show me what I got wrong in my last quiz attempt."
- 🧑‍🎓 "Has anyone asked in the forum about the Dockerfile cache? If not, help me ask."
- 🧑‍🎓 "How am I doing in the course, and what did the teacher say about practice 1?"

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/moodle-mcp@0.3.0`, a student's tools, with your settings |
| 🔎 `read-a-course` | Sections, resources and activities, what's locked and why, what counts as done |
| 🗓️ `plan-my-work` | What's left, deadlines and cut-offs, what unlocks what, in a realistic order |
| 📤 `hand-in-an-assignment` | What it accepts, saving, checking and submitting for good, the statement |
| 📝 `take-a-quiz` | Rules before starting, answering each question type, submitting, the review |
| 💬 `forums` | Reading threads, asking where it belongs, posting exactly once, writing to the teacher |
| 🧩 `other-activities` | Choices, surveys, lessons, SCORM, H5P, peer assessment and manual completion |
| 📊 `grades-and-feedback` | The grade report, each activity's feedback, and what's still to be graded |
| 🌐 `several-sites` | Adding and switching sites, kept apart |
| 📅 `/moodle-student:week` | What you have to do this week, in order |

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (its settings in `userConfig`, agent-kit's data in `metadata["agent-kit"]`), `.mcp.json`, `skills/` and `commands/`. To try a change, link it into an agent instead of installing it (`my-agent extension add ./moodle-student --link`), and check it with `claude plugin validate --strict moodle-student`. How agent-kit runs it: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/next/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
