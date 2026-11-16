---
name: linkedin-and-sites
description: What the agent may and may not do with LinkedIn, Google Maps, business directories and companies' websites when looking for placement companies - nothing automated on LinkedIn (its terms forbid scraping and bots, and it suspends accounts), Google Maps only through the Places API with the person's key, directories and sites read only where robots.txt allows - and how the person uses each by hand. Use when the person asks to search LinkedIn, Google Maps or a directory for companies, to find a contact person, or why a site wasn't read.
---

# LinkedIn, maps, directories and websites

The work-placements server reads only what's public and allowed. Everything else the person does by hand, with their own accounts, and tells you what to keep.

## LinkedIn

- **Nothing automated.** LinkedIn's User Agreement forbids scraping, bots and automated access, and LinkedIn restricts or suspends accounts that use them. Never open, search or read LinkedIn for the person, not with a browser tool either, and never ask for their LinkedIn password.
- **By hand, it helps.** The person can search the company's page and its people, look at its posts (it may be hiring or growing), and write to someone through LinkedIn with their own account. `read_company_site` lists the company's LinkedIn page under `social` when its site links it: give the person the link.
- **What to keep.** What the person reads to you and wants kept: `update_company` (`notes`, or `people` for a named contact, with their yes: personal data) and `log_contact` with `channel: "other"` for a message sent there.

## Google Maps

- Only through the Places API, with the person's own key in the extension's settings: `search_companies` searches it too then. No key, no Google: never read Google Maps' pages.
- Its terms limit storage: the record keeps a Places result's `placeId`, plus what the person confirms or the company's own site says; its other data is shown, not stored.
- By hand, the person can look a company up in Maps (opening hours, photos, reviews) and tell you what to keep.

## Directories and platforms

- A chamber of commerce's directory, a regional platform for placements, a business association's list: if they offer a download (CSV or Excel), `import_companies` brings it in, `dryRun` first.
- If not, the person searches them by hand. Don't read directory sites page by page with any tool: many forbid it in their terms or their `robots.txt`.

## Companies' websites

- `read_company_site` reads a company's own site: its `robots.txt` first, then the home page and a few contact and jobs pages, as plain HTML without a browser.
- A page refused by `robots.txt`, or a site whose `robots.txt` didn't answer, isn't read: say so and give the person the address. Never try another way around it.
- A site built entirely by scripts may show little: the person can open it and read the contact page to you.
- Contact forms: the person fills them in; then `log_contact` with `channel: "form"`.
