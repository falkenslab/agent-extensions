---
name: placement-tracker
description: Follow placement companies in the work-placements record - where each stands (to contact, contacted, interested, meeting, agreement, hosting students, not now, declined), who to write to or call today and this week, companies that went quiet, statuses moved as things happen, and the record exported to Excel or CSV for the department. Use when the person asks who to follow up with, how the search for companies is going, to update a company, or for the list for their department.
label: es=Seguimiento de empresas | en=Company follow-up | fr=Suivi des entreprises | de=Firmen nachverfolgen
icon: 📞
group: day
---

# Following placement companies

The record is the person's, on their computer: one company per entry, with its status and every contact. Reading it changes nothing; moving a status or noting a contact is a write, with the person's yes.

## Today's follow-up

1. `pipeline_summary`: follow-ups `overdue`, `dueToday` and `upcoming` (the next 7 days, or `days`), `stale` (open companies with no next step and no contact for 14 days, or `staleDays`), and counts by status.
2. Answer as a short list, most urgent first: who to call or write to, and why (the next step they noted). `list_companies` with `id` gives a company's whole history when the person wants to prepare a call.
3. Offer what follows: drafts for those to write to (`company-outreach`), and noting each call once it's made (`log_contact`). Change nothing on your own.

## Statuses

- `to_contact`: in the record, not contacted yet.
- `contacted`: written to or called, no answer yet.
- `interested`: they answered and want to know more.
- `meeting`: a meeting or a visit is arranged.
- `agreement`: they've agreed to host students (the paperwork is the school's).
- `hosting`: students are there now.
- `not_now`: not this time; worth asking again another year.
- `declined`: no.

Move a status with `log_contact` (`status`) when a contact changes it, or `update_company` (`status`) otherwise. `update_company` also corrects details (`clear` removes a field) and replaces `tags` and `people` as whole lists.

## Lists and the department's export

- `list_companies` filters by `status`, `town`, `sector`, `tag` or `query`, and `due: true` (or `dueBy`) for what's due; it pages with `limit`, `offset` and `more`.
- `export_companies`: an Excel workbook (`.xlsx`, a sheet of companies and one of contacts) or `csv` (with `delimiter: ";"` for an Excel that expects it), filtered by `status` or `tag`. Named people go in only with `people: true`, when the person asks: they're personal data. It writes a new file, never overwriting one; tell the person where.
- `import_companies` brings another teacher's or last year's spreadsheet in, with `dryRun` first; duplicates are skipped and listed, never overwritten.
- `server_info` says where the record and the exports are.

## With other extensions

Reminders as `.ics` with the calendar extension's `write_ics`, and a report in the school's template with the documents extension's `write_docx`, when they're installed; say so when they aren't.
