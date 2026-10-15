---
name: grade-with-rubric
description: Grade a Moodle assignment's submissions with its rubric (or marking guide) through moodle-mcp - read the rubric and each submission, propose a level per criterion with feedback, and only grade what the person approves. Use when the person asks to grade, mark or give feedback on an assignment.
---

# Grading with the rubric

The person grades; you prepare. Never grade without their yes, submission by submission or as a reviewed batch.

## Steps

1. **Read how it's graded.** `get_rubric` gives the method: a simple grade, a rubric (criteria with levels and points) or a marking guide. Read it to the person in a few lines.
2. **Read what's to grade.** `get_submissions` (a page at a time; `includeContent` for the texts and files) lists who submitted and their status. Students appear as aliases (A-7KQ2XM): use them as given, never try to find out who they are.
3. **Propose.** For each submission: the level per criterion (or the grade), with a reason quoting the work, and feedback addressed to the student as "you". Show the proposals as a table the person can correct.
4. **Grade what's approved.** `grade_submission` with `user` (the alias), `rubric` (the levels chosen) or `grade`, and `feedback`. Ask whether to `notify` the students; the default is not to.
5. **Close.** Say how many are graded and which are left; `set_workflow_state` only if the assignment uses a marking workflow and the person asks.

## Good practice

- Feedback with an alias in it is refused (people would read it as is): write "you", never the alias.
- Be consistent: the same evidence, the same level. When a submission doesn't fit the rubric, say so instead of forcing a level.
- Late submissions and extensions (`grant_extension`) are the person's decision: point them out, don't apply penalties on your own.
