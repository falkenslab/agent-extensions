<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/calendar/assets/logo.svg" alt="calendar extension logo: a calendar page with a coral header and one day marked with a bell" width="112"/>

# calendar

**Your AI agent puts your dates in a calendar file, ready to import.**<br/>
Events, deadlines and plans as an .ics file that Google Calendar, Outlook and Apple Calendar import, in your time zone, with all-day events, repetitions and reminders.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, its own small MCP server and what to do with it: turning the dates it works out with you (a class's sessions, an assignment's deadlines, a study plan) into an `.ics` file (iCalendar, RFC 5545) on your computer, which you import into the calendar app you already use; and reading an `.ics` back, to check it or to see what one holds. It touches no calendar account: you import the file. It knows the file format, not teaching or studying: an agent like [miyagi](https://github.com/falkenslab/miyagi) or [padawan](https://github.com/falkenslab/padawan) installs it to put a plan's dates in a calendar, and the dates themselves (term dates, holidays) are yours to bring.

## ✨ Why this extension

- 🌍 **In your time zone.** Times are the ones on your clock; the file carries your zone's rules, summer time included, so a 9:00 class stays at 9:00 all year.
- 📅 **All-day or at an hour.** Deadline days and exam weeks as all-day events, classes and sessions with their start and end.
- 🔁 **Repetitions.** Every week on Monday and Wednesday, every two weeks, the first Thursday of the month, until a day or so many times, with the days off left out.
- 🔔 **Reminders.** As many minutes, hours or days before as you want.
- ✅ **Checked before it's written.** An end before its start, an unknown zone or an impossible date is refused, every problem at once, and an existing file is never replaced unless you say so.
- 👀 **Read back.** Any `.ics` file's events, repetitions in words, to check what you're about to import.
- 🪶 **Nothing to install.** One bundled server, run with Node; no account, no network.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit or Claude Code.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add calendar@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install calendar@falkenslab
```

It needs no settings. Then ask: "Put my essay deadlines in a calendar file, with a reminder the day before." Codex installs it too (`codex plugin marketplace add falkenslab/agent-extensions`, then `codex plugin add calendar@falkenslab`), and its skill loads, but its server doesn't start: Codex doesn't expand `${CLAUDE_PLUGIN_ROOT}`, the extension's folder, in `.mcp.json`.

## 💬 What you can ask

- 👩‍🏫 "Make an .ics with my Tuesday and Thursday classes from 15 September to 18 December, 10:00 to 11:30, except the week of 2 November."
- 👩‍🏫 "Put the unit's three deadlines in a calendar file, each with a reminder a week and a day before."
- 🧑‍🎓 "Turn my study plan for the exams into a calendar I can import into Google Calendar."
- 🧑‍🎓 "What's in this .ics my school sent me?"
- 🧑‍🎓 "How do I import it into Outlook?"

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `node ${CLAUDE_PLUGIN_ROOT}/dist/server.mjs`, bundled: `write_ics`, `read_ics`, `server_info` |
| 📅 `calendar-files` | The person's time zone, all-day or timed, repetitions or separate events, reminders, where to save, reading the file back, and importing it into Google Calendar, Outlook or Apple Calendar |

## 📚 Documentation

- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)**: how agent-kit runs an extension with its own bundled server, like this one.
- **[The extensions reference](https://falkenslab.github.io/agent-kit/docs/extensions/reference)**: every field of the manifest and of `metadata["agent-kit"]`.
- **[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)**: the iCalendar format the files follow.

## 🛠️ Developing

The server's code is in [`mcps/calendar/`](../../mcps/calendar/), which goes to npm as `@falkenslab/calendar-mcp`; there `npm install`, `npm run build` and `npm test` build and test it, and the build copies it into this extension's `dist/server.mjs`, which is committed until the extension runs it from npm. To try a change, link the extension into an agent (`my-agent extension add ./extensions/calendar --link`) and check it with `claude plugin validate --strict extensions/calendar`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
