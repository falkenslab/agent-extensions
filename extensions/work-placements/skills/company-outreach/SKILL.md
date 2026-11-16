---
name: company-outreach
description: Contact placement companies with the work-placements server - one email draft per company from the person's own letter, to its generic address, written as .eml files that Outlook and Thunderbird open unsent for the person to review and send; never sending anything, never a mass mailing; and calls, visits and sent emails logged as contacts with their next step. Use when the person wants to write to companies about placements, prepare emails, or note a call or a visit.
---

# Contacting companies

The server never sends anything. It writes drafts the person opens, reviews and sends from their own mail client, and it notes what they tell you happened.

## Email drafts

1. **The person's own letter.** Ask for their template (the text, or a file) or write it with them; the server never writes the email itself. It fills placeholders per company: `{{name}}`, `{{town}}`, `{{sector}}`, `{{address}}`, `{{email}}`, `{{phone}}`, `{{website}}`, `{{tax_id}}`, `{{contact_name}}`, `{{contact_role}}`, and `{{contact_name|fallback}}` for a value a company may lack. A file's first line `Subject: …` gives the subject.
2. **What the letter carries**, as the server has no say in it: the school and the teacher identified (name, role, how to reach them), why they're writing, and a line saying how to ask not to be written to again. Rules on unsolicited email differ by place and by who writes: tell the person to check with their administration's data protection officer if unsure.
3. **The companies**, by their ids: those `list_companies` gives with `status: ["to_contact"]` and an email, chosen with the person. `draft_emails` takes at most 50 at a time and writes one `.eml` per company to its own address in the record, never several companies in one message, never anyone in Cc. Pass the person's address as `from` (and `fromName`) so their client sends from it.
4. **Check before they send.** Show where the drafts are (`dir`) and the ones skipped: no email in the record (`read_company_site` may find one, or a call), or a placeholder without a value (add it to the company with `update_company`, or give it a fallback). Outlook opens an `.eml` with `X-Unsent: 1` as a draft to send; Thunderbird opens it, and Edit as New Message makes it sendable.
5. **After they've sent them**, and only then: `log_contact` per company with `channel: "email"`, a one-line summary, and the next step with its date if they want a reminder ("call if no answer", a week later). A draft that wasn't sent isn't a contact.

## Calls, visits and meetings

`log_contact` with the `channel` (`phone`, `visit`, `meeting`, `video`, `form` for a web form, `other`), the date if it wasn't today, what happened in a line or two, who it was with only if the person wants it noted, and the next step with its date. Pass `status` when it changes: `interested`, `meeting`, `agreement`, `hosting` once students are there, `not_now`, `declined`. A company still to contact becomes contacted on its own.

## With other extensions

- A follow-up reminder in the person's calendar: the calendar extension's `write_ics`, if it's installed, with the next step's date.
- A letter or a dossier in the school's Word template: the documents extension's `write_docx`, if it's installed.
- When one isn't installed, say so: the record keeps the next step, and the day's follow-up shows it.
