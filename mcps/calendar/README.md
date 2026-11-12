# calendar-mcp

An MCP server that writes and reads iCalendar (`.ics`) files: timed events in a time zone (with its `VTIMEZONE`), all-day events, repetitions with exceptions and reminders, as RFC 5545, that Google Calendar, Outlook and Apple Calendar import. It's the server of Falken's Lab's [calendar extension](https://github.com/falkenslab/agent-extensions/tree/main/extensions/calendar), which adds its skill and how an agent uses it well.

## 🚀 Running it

`npx -y @falkenslab/calendar-mcp` starts it over stdio, with no settings and nothing to install: one file, pure JavaScript, no network. Its tools: `write_ics`, `read_ics`, `server_info`.

## 🛠️ Developing

`src/server.mjs` holds the tools, `ics.mjs` the writing, `parse.mjs` the reading and `tz.mjs` the time zones, from the platform's own data. `npm test` checks the files with [ical.js](https://github.com/kewisch/ical.js) (time zones, repetitions across clock changes, all-day ends) and lists the built server's tools.

In this folder, `npm install`, `npm run build` (one file, `dist/server.mjs`, with esbuild) and `npm test`. Until the extension runs the server from npm, the build also copies it into [`extensions/calendar/dist/`](../../extensions/calendar/dist/), which is committed. `npm publish` builds and tests it first; the version goes up together in `package.json`, the server's `VERSION` and the extension's `plugin.json`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
