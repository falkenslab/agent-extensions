<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/work-placements/assets/logo.svg" alt="work-placements-mcp logo" width="112"/>

# work-placements-mcp

**Your AI agent finds, contacts and follows the companies where your students do their work placements.**<br/>
Companies found on OpenStreetMap, their public sites read, a local record of companies and contacts, CSV and Excel for the department, and email drafts that it never sends.

![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

</div>

work-placements-mcp is an MCP server for a teacher who looks for placement companies (dual training, internships, Erasmus+): it searches for businesses by sector in a town or around a point, reads their public websites for a generic email, a phone and their "work with us" page, keeps a record of companies and every contact with them on your computer, imports and exports it as CSV or Excel, and writes one email draft per company from your own template. It sends nothing: you review and send each draft from Outlook or Thunderbird. It's the server of Falken's Lab's [work-placements extension](../../extensions/work-placements/), whose skills say how an agent uses it well.

## ✨ Why work-placements-mcp

- 🗺️ **Open data first.** OpenStreetMap's businesses by sector, in a town's boundary or a radius, with their contact data when OSM has it; Google Places too, only with your own key.
- 🌐 **Polite with websites.** `robots.txt` read before every page, its own User-Agent, a few pages per site.
- 🗂️ **One record, no duplicates.** Companies matched by tax id, or by name and town, and every search marks those already there.
- 📊 **Excel for the department.** A workbook with a sheet of companies and one of contacts, or CSV; and last year's list imported from either.
- ✉️ **Drafts, never sends.** One `.eml` per company, from your own text, that opens unsent in your mail client.
- 🔒 **On your computer.** The record is a file in the extension's data folder; named people go in an export only when you ask.

## 🚀 Quick start

With [Node.js](https://nodejs.org) 20 or later, add it to Claude Code from this repository's folder (it isn't on npm yet):

```bash
cd mcps/work-placements && npm install && npm run build
claude mcp add work-placements -e WORK_PLACEMENTS_AREA="La Laguna, Tenerife" -- node "$PWD/dist/server.mjs"
```

Then ask for companies. In an agent built on agent-kit, or in Claude Code with its skills, install the [work-placements extension](../../extensions/work-placements/) instead.

## 💬 What you can ask

👩‍🏫 As a teacher:

- "Find IT and electrical companies in Tacoronte that aren't in my record yet."
- "Read these five companies' websites and add the ones with a generic email."
- "Import last year's companies from this Excel file."
- "Write a draft to each company I added today, from my letter."
- "Who do I have to call this week?"
- "Export the companies with an agreement for the department, in Excel."

## 🧰 What's inside

| Area | For example |
| --- | --- |
| 🔎 Search | `search_companies` (OSM by sector and area, Places with a key, marking those in the record), `read_company_site` (emails, phones, contact and jobs pages, what it does) |
| 🗂️ Record | `add_company`, `update_company`, `log_contact`, `list_companies` (filters, what's due), `pipeline_summary` (by status, follow-ups) |
| 📊 Spreadsheets | `import_companies` (CSV or .xlsx, headings in English or Spanish, a dry run first), `export_companies` (.xlsx or CSV) |
| ✉️ Drafts | `draft_emails` (one `.eml` per company, `X-Unsent: 1`) |
| ⚙️ System | `server_info` (version, settings, where the record and files are) |

## ⚙️ Settings

| Variable | What it is |
| --- | --- |
| `WORK_PLACEMENTS_AREA` | The area searched when a search names none: a town, a region, or `lat,lon` |
| `WORK_PLACEMENTS_PLACES_KEY` | Your own Google Places API key (Places API (New)); optional, Places is searched only with it |
| `WORK_PLACEMENTS_DIR` | Where drafts and exports go; default `Documents/work-placements` |
| `CLAUDE_PLUGIN_DATA` | Where the record is kept (the extension's data folder); default `~/.work-placements-mcp` |

A setting left as a literal `${user_config.*}`, as Codex passes it, counts as not set.

## 📐 How it works

- **The record** is one JSON file, `record.json` in the data folder, written to a temporary file and renamed over the old one, so a crash never leaves half of it. Node's built-in SQLite was left out: on Node 22 it's still experimental, and it would need Node 22.13 or later. One teacher's few hundred companies don't need a database.
- **Statuses**: `to_contact`, `contacted`, `interested`, `meeting`, `agreement`, `hosting` (hosting students), `not_now`, `declined`. Each contact has its date, channel, summary, who it was with, and a next step with its date, which is what the follow-ups are built from.
- **Sectors** are words mapped to OSM tags (`it` is `office=it`, `shop=computer`, `craft=electronics_repair`…); a raw tag such as `craft=carpenter` works too. Data © OpenStreetMap contributors, under the [ODbL](https://www.openstreetmap.org/copyright); place names are looked up with Nominatim. Both are public services with usage policies: one request at a time, and they may be busy.
- **Google Places**: its terms limit what may be stored, so a Places result keeps only its `place_id` in the record, plus what the teacher confirms or the company's own site says.
- **Websites** are read with plain HTTP, without a browser, so a site built entirely by scripts shows little; a browser for those (the system's Edge or Chrome) is for a later version, and then `check_requirements` will check it. `robots.txt` follows RFC 9309: a missing file allows everything, an unreachable one nothing.
- **Excel** files are written and read by a small built-in writer and reader (an `.xlsx` is a zip of XML), with no native dependencies: text and numbers, a bold header row, phones and tax ids kept as text. An old `.xls` must be saved as `.xlsx` or CSV first. CSV is read in UTF-8 or Windows-1252, with `,`, `;` or tab.
- **Drafts** are plain-text `.eml` files in UTF-8 with `X-Unsent: 1`, which Outlook opens as a draft to send and Thunderbird opens to edit and send. Never overwritten: a second one gets `-2`.

## 🛠️ Developing

In this folder: `npm install`, then `npm run typecheck`, `npm run lint`, `npm test` (with every network call faked), `npm run build` (one file, `dist/server.mjs`, with esbuild, copied into `extensions/work-placements/dist/` while it isn't on npm) and `npm run check` (the built server's tools, complete). CI builds and tests it with the other servers in `mcps/` and fails if the extension's copy is stale. `npm publish` runs all of them first; releases are published to npm by the owner.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
