---
name: hand-in-an-assignment
description: Hand in a Moodle assignment as a student with moodle-mcp - read what it asks and accepts, download its files, save the submission (online text or files), check it, and submit it for good only with the person's yes, including the submission statement, drafts, resubmissions and group work. Use whenever the person works on, saves, changes or submits an assignment, or asks whether it was received.
---

# Handing in an assignment

What the work says is the person's (or comes from wherever the agent's study knowledge does); this skill is how it reaches Moodle intact and on time. Submitting is final: nothing goes for grading without the person's yes.

## 1. What it asks and accepts

`get_assignment` gives the brief and its files, the dates (due, cut-off, extension), the submission's status and content, and whether it can be edited or submitted now. Before writing anything:

- **What it accepts**: online text, files, or both; the number of files and their types, as the brief or the page says. A PDF asked for and a `.docx` uploaded is a submission that doesn't count.
- **The brief's files**: `download_file` saves them to a local folder (a template, a dataset, a statement).
- **Group work**: one submission for the group; what one member saves is what the group hands in.
- **The dates**: after the due date it's marked late; after the cut-off date Moodle accepts nothing.
- **Draft or handed in**: `drafts` says whether saving leaves a draft that `submit_assignment` then submits (`true`) or saving hands it in (`false`), and `statement` is the submission statement the site asks to accept. Before the first save Moodle's pages often don't tell, and `drafts` is absent: don't tell the person either way until `save_submission`'s `changed` says which it was.

## 2. Saving

`save_submission` with `onlineText` (HTML; it **replaces** what was there, so send the whole text; check it first with `validate_html`, which reports tags left open and what Moodle's cleaning will remove) and/or `files` (absolute local paths; they're added to what's there). Saving changes the submission: confirm with the person first. It returns the assignment as Moodle now has it: check the text and the files are there.

Without drafts (`drafts: false`), saving **is** handing it in: the teacher can see it and grade it from then on. Say so before saving. If the site asks to accept a statement then, the call fails quoting it: show it to the person, and only with their yes save again with `acceptStatement: true`.

## 3. Submitting for good

When the assignment asks students to submit:

1. **Check it first** with `get_assignment`: every part the brief asks for, the format, the files, nothing left from an earlier draft.
2. **Ask the person**, showing what will be submitted: after `submit_assignment` it can't change unless the teacher reopens it.
3. **The statement**: when the site asks to accept one ("this is my own work"), the call fails quoting it. Show it to the person, and only with their yes call again with `acceptStatement: true`. Never accept it on their behalf without asking.
4. **Read it back**: `get_assignment` must say submitted.

## Afterwards

- Grade and feedback come back in `get_assignment` (and in `get_my_grades`); feedback files with `download_file`, which only takes them with names in clear (see `read-a-course`): otherwise the person opens them in Moodle.
- A reopened submission (resubmission after feedback) is saved and submitted again the same way; the earlier one stays as a previous attempt.
- More time is the teacher's to grant: suggest writing to them (`send_message`) instead of looking for a way around a closed assignment.
