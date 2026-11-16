---
name: find-companies
description: Find companies for students' work placements with the work-placements server - the person's record first, then OpenStreetMap by sector in a town or around a point, Google Places when they've set a key, the companies' own websites for a generic email and a phone, and spreadsheets they already have - adding to the record only what they choose, without duplicates. Use when the person asks for companies to host placements, internships, dual training or Erasmus+ students, in a place or a sector.
label: es=Buscar empresas | en=Find companies | fr=Trouver des entreprises | de=Unternehmen finden
icon: 🏢
group: plan
---

# Finding placement companies

The work-placements server searches public sources and keeps one record on the person's computer. It finds and records; which companies suit a course, and how to approach them, is the person's call (and the craft of an agent like miyagi, if it's installed).

## Sources, in this order

1. **The record.** `list_companies` with the sector, town or tag first: last year's companies, those that said "not now", those already hosting. Don't search for what the person already has.
2. **Spreadsheets they have.** Last year's list, a chamber of commerce's directory, a regional platform's export: `import_companies` with `dryRun: true` first, show how the columns were read and what would be added or skipped as a duplicate, then import with their yes. Headings in English or Spanish are recognised; map others with `columns`.
3. **OpenStreetMap.** `search_companies` with `sectors` and `area` (a town or a region, or `lat,lon`; the settings' area when they don't say). Sectors are ids (`it`, `electrical`, `automotive`, `hospitality`, `office`, `commerce`, `health`, `education`, `beauty`, `construction`, `industry`, `food`, `agriculture`, `logistics`, `media`, `sport`, `social`) or a raw OSM tag such as `craft=carpenter`. A town searches inside its boundary; `radiusKm` searches around its centre instead, for neighbouring towns. Results with more ways to reach them come first, and `inRecord` marks those already in the record.
4. **Google Places**, searched by the same call only when the person has set their own key (`places` in the result says whether). Its terms limit what may be kept: a Places result goes into the record only with its `placeId` and what the person confirms or the company's own site says.
5. **The companies' websites.** OpenStreetMap has an email for few businesses, so `read_company_site` (a `url`, or the `companyId` of one in the record) reads the home page and a few contact and "work with us" pages: emails (generic ones such as info@ first), phones, those pages, its social profiles and what it does. For many companies, hand the list to the `company-researcher` subagent, which returns a short card per company.

## Adding to the record

- Show what was found as a short table (name, town, sector, how to reach it, already in the record?) and let the person pick. Never add a whole search without their yes.
- `add_company` with what they keep: name, town, sector, the company's generic `email` and `phone`, `website`, `taxId` when known, and `osmId` or `placeId` from the search; `source` says where it came from. `tags` can carry the person's own labels, such as the course.
- Duplicates are refused by tax id, OSM element, Places place, or name and town, naming the one already there: then `update_company` that one instead. `allowDuplicate` only when the person says they're two companies.
- Named people at a company (a manager's name, a mobile) are personal data: add them (`people`) only when the person gives them or asks, and only what's needed.

## What to say

- Cite OpenStreetMap when showing its data: "© OpenStreetMap contributors".
- A busy Overpass or Nominatim ("busy right now") clears in a minute: say so and offer to try again, or a smaller area or fewer sectors.
- `read_company_site` reads plain HTML without a browser: a site built entirely by scripts shows little, and a site whose `robots.txt` refuses robots isn't read. Say so and give the person the address to open; never try to get around a refusal.
- No email anywhere is common: a phone call or the contact form on its site is the way, and `linkedin-and-sites` says what the person can do by hand.
