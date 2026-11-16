<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/work-placements/assets/logo.svg" alt="work-placements extension logo: a company building with a map pin over it and an envelope beside it" width="112"/>

# work-placements

**Your AI agent finds, contacts and follows the companies where your students do their work placements.**<br/>
Companies by sector in your area, their websites read for a way to reach them, a record of every company and contact on your computer, Excel for the department, and email drafts you review and send.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit) or Claude Code an MCP server, [work-placements-mcp](../../mcps/work-placements/), and what to do with it, for a teacher who looks for companies to host students: dual training, internships or Erasmus+. The agent searches OpenStreetMap for businesses by sector in a town or around it (and Google Places, with your own key), reads their public websites for a generic email, a phone and their "work with us" page, keeps a record of companies and contacts with what's due next, imports last year's spreadsheet and exports the record to Excel, and writes one email draft per company from your own letter. It sends nothing. It knows these tools and sources, not how to prospect well or any country's rules: an agent that does, like [miyagi](https://github.com/falkenslab/miyagi), installs it.

## ✨ Why this extension

- 🗺️ **Open data first.** OpenStreetMap's businesses by sector, cited; Google Places only with your own key, keeping only what its terms allow.
- 🗂️ **One record, no repeats.** Every search marks the companies you already have; duplicates by tax id, or by name and town, are refused.
- ✉️ **Drafts, never sends.** One `.eml` per company to its own generic address, from your letter, opened unsent by Outlook or Thunderbird for you to review and send.
- 📞 **Today's follow-up.** Who to call or write to, from the next steps you noted, and the companies that went quiet.
- 📊 **Excel for the department.** The record as a workbook or CSV; named people only when you ask.
- 🔒 **Polite and private.** `robots.txt` respected, nothing automated on LinkedIn, and the record on your computer.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, and an agent on agent-kit or Claude Code.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add work-placements@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install work-placements@falkenslab
```

It asks for three settings, all optional: your area (a town or region searched when you don't say one), your Google Places API key (a secret, only to search Google Maps' businesses too), and the folder for drafts and exports (else `Documents/work-placements`). Then ask: "Find IT companies in La Laguna that aren't in my record yet." In Codex, which has no settings, say the area in the chat; Google Places isn't searched there.

## 💬 What you can ask

- 👩‍🏫 "Find electrical and automotive companies within 10 km of Tacoronte."
- 👩‍🏫 "Read the websites of the ones without an email and tell me how to reach them."
- 👩‍🏫 "Import last year's companies from this Excel file."
- 👩‍🏫 "Write a draft to each company I added today, from my letter in Documents."
- 👩‍🏫 "I called Talleres Ruiz: they're interested, call back on Monday."
- 👩‍🏫 "Who do I have to call or write to today?"
- 👩‍🏫 "Export the companies with an agreement for the department."

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `npx -y @falkenslab/work-placements-mcp@0.1.0` ([work-placements-mcp](../../mcps/work-placements/)): `search_companies`, `read_company_site`, `add_company`, `update_company`, `log_contact`, `list_companies`, `pipeline_summary`, `import_companies`, `export_companies`, `draft_emails`, `server_info` |
| 🧩 `find-companies` | The sources in order (the record, your spreadsheets, OpenStreetMap, Google Places with your key, the companies' websites), areas and sectors, and adding only what you choose, without duplicates; in miyagi, the button "Find companies" |
| 🧩 `company-outreach` | One draft per company from your own letter, to its generic address, identified and with a line to opt out, never a mass mailing; calls, visits and sent emails logged as contacts |
| 🧩 `placement-tracker` | The statuses, today's follow-ups and the quiet companies, and the department's export; in miyagi, the button "Company follow-up" |
| 🧩 `linkedin-and-sites` | What the agent may and may not do with LinkedIn, Google Maps, directories and websites, and how you use each by hand |
| 🤖 `company-researcher` | Subagent: researches companies (the record, OpenStreetMap, their own sites) and returns a short card for each (changes nothing) |

## 📐 Good practice with these sources

- **The record first.** Last year's companies and those that said "not now" come before any search.
- **OpenStreetMap is uneven.** Few businesses have an email there (around one in eight in a sample) and fewer than half a phone: the companies' own websites fill the gaps.
- **Google Places' terms** limit what may be stored: its `place_id`, plus what you confirm or the company's own site says.
- **One message to one company**, to its generic address, saying who you are and how to opt out. Rules on unsolicited email vary: check with your administration's data protection officer if unsure.
- **Named people are personal data.** They stay on your computer, only what's needed, and go into an export only when you ask.
- **LinkedIn by hand only.** Its terms forbid bots and scraping, and it suspends accounts that use them.

## 📚 Documentation

- **[OpenStreetMap's copyright and licence](https://www.openstreetmap.org/copyright)**: the ODbL, and how to cite it.
- **[OpenStreetMap's map features](https://wiki.openstreetmap.org/wiki/Map_features)**: the tags (`office`, `craft`, `shop`, `industrial`…) a sector can also be searched by.
- **[Google's Places API (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)**: getting a key, and its policies.
- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)**: how agent-kit runs an extension and checks what it requires.

## 🛠️ Developing

The server's code is in [`mcps/work-placements/`](../../mcps/work-placements/), published to npm as `@falkenslab/work-placements-mcp`, which `.mcp.json` runs at a fixed version with `npx`; there `npm install`, `npm run build` and `npm test` build and test it. To try a change, link the extension into an agent (`my-agent extension add ./extensions/work-placements --link`) and check it with `claude plugin validate --strict extensions/work-placements` and `node scripts/check-tools.mjs work-placements`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
