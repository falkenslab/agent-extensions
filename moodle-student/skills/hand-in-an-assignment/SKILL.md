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

## 2. Saving

`save_submission` with `onlineText` (HTML; it **replaces** what was there, so send the whole text) and/or `files` (absolute local paths; they're added to what's there). Saving changes the submission: confirm with the person first. It returns the assignment as Moodle now has it: check the text and the files are there.

If the assignment doesn't ask students to click submit, saving **is** handing it in: the teacher can see it and grade it from then on. Say so before saving.

## 3. Submitting for good

When the assignment asks students to submit:

1. **Check it first** with `get_assignment`: every part the brief asks for, the format, the files, nothing left from an earlier draft.
2. **Ask the person**, showing what will be submitted: after `submit_assignment` it can't change unless the teacher reopens it.
3. **The statement**: when the site asks to accept one ("this is my own work"), the call fails quoting it. Show it to the person, and only with their yes call again with `acceptStatement: true`. Never accept it on their behalf without asking.
4. **Read it back**: `get_assignment` must say submitted.

## Afterwards

- Grade and feedback come back in `get_assignment` (and in `get_my_grades`); feedback files with `download_file`.
- A reopened submission (resubmission after feedback) is saved and submitted again the same way; the earlier one stays as a previous attempt.
- More time is the teacher's to grant: suggest writing to them (`send_message`) instead of looking for a way around a closed assignment.
