---
name: assignments
description: Create or reconfigure a Moodle assignment with moodle-mcp so its statement, its submission settings and its grading agree - submission types, files and formats, dates and cut-off, groups, attempts, feedback types, grade, marking workflow, rubric - and change one safely once students have submitted. Use whenever an assignment is created or its settings change.
---

# Assignments in Moodle

An assignment is three things that must agree: the **statement** (what to hand in, how it's graded), the **submission settings** (what Moodle lets students upload, and until when) and the **grading** (grade, rubric, feedback). A statement asking for a PDF on an assignment that only takes online text is the commonest way to break one.

## Settings for each kind

| Kind of work | Submission settings |
| --- | --- |
| Short written answer | Online text, with a word limit if the statement sets one |
| A document (essay, report) | File submissions: 1 file, accepted types the formats the statement names |
| Code or a technical deliverable | Files (a `.zip` or the files), or online text with a repository link |
| Group work | "Students submit in groups", "Require group to make submission", group mode on the course's groups (create them first: `create_group`, `set_group_members`) |
| Drafts with feedback and resubmission | "Require students to click the submit button", attempts reopened manually or until pass, maximum attempts |
| Oral presentation or video | Online text with the link, or a file with a size limit that fits a video |
| Work done in class, graded in Moodle | No submission types at all |

When the task calls for it: "Require that students accept the submission statement", anonymous submissions, marking workflow (grades released together; see `grading`).

## Creating it

1. **Learn the form's field names.** `get_activity_settings` on an existing assignment of the course lists every field with its form name, label, value and options. Use those names in `settings`; never guess them. Dates are groups of fields (`duedate[enabled]`, `duedate[day]`, `duedate[month]`...).
2. **Create it hidden** with `create_activity` (`type: "assign"`): `name`, the statement as `description` (HTML), `settings` for submission types, dates and grade, `completion` and `restrictions` if the unit uses them. If you couldn't read an existing one, create it with the common inputs, read its settings, then `update_activity`.
3. **Read it back** (`get_activity_settings`) and compare with the statement: the formats, the number of files, the dates and the grade it promises.
4. **Its rubric**, if graded by hand (below), then `publishing` to check and show it.

## Settings that are easy to get wrong

- **Dates**: "Allow submissions from", "Due date", "Cut-off date" (late work accepted until then, marked late; after it, nothing) and "Remind me to grade by". Keep them in the course calendar's order.
- **Accepted file types**: only types Moodle knows. If a format isn't in its list (`.md`), don't restrict to it: say it in the statement.
- **Feedback comments** must be on for written feedback to be saved at all; feedback files if annotated documents go back.
- **Grade**: the maximum the rubric adds up to, and the gradebook category if the course uses them (see `gradebook`).
- **Late penalties**: Moodle 5 applies them automatically only when the site administrator enabled grade penalties. If the setting isn't in the form, tell the person to ask the administrator or apply it by hand; never that Moodle can't do it.

## Its rubric

moodle-mcp 0.3.0 reads a rubric (`get_rubric`) but has no tool to define one. Draft the criteria and levels (each level with its description and points; the top levels add up to the maximum grade), then either:

- the person defines it in Moodle: the assignment's "Advanced grading", "Change active grading method to" Rubric, "Define new grading form from scratch", "Save rubric and make it ready"; or
- with their yes, you do it with the `browser_*` tools, typing into each field (the rubric editor only saves what it saw typed) and reading the page again after saving.

Then `get_rubric` confirms it's ready, with the criteria intended. Saving it is a publication: students see the rubric.

## Changing one with submissions

Read `get_submissions` first. Once students have submitted, don't change what it asks, its formats or its grade: they did the work against the old one. Dates can move (say so to the person: students are notified only if the person announces it); an individual extra is `grant_extension`, not a new due date for all.
