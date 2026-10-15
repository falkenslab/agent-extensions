---
name: other-activities
description: Set up Moodle's other activities with moodle-mcp so they behave as intended - workshop (peer assessment) and its phases, lesson, glossary, wiki, database, forum types and whole-forum grading, choice, feedback survey, H5P, SCORM - and the pieces that connect activities - completion, access restrictions, groups and groupings, badges. Use when a course needs something other than a resource, an assignment or a quiz, or when activities must unlock, track or group.
---

# Other activities, and what connects them

Check the type is offered first (`get_site_info` with `courseId`), create it hidden (`create_activity`), learn its form's field names from `get_activity_settings` on one like it, and follow the `publishing` skill. Every activity's description says what to do, how, by when and how it's assessed.

## Workshop: peer assessment

- **Phases**: setup, submission, assessment, grading evaluation, closed. The dates ("open for submissions from", "open for assessment from" and their deadlines) are what open and close each phase for students; with them set, `set_workshop_phase` switching early is harmless, without them it's the only switch. Moodle allocates nothing and computes no grades on its own when the phase changes.
- **Two grades**: one for the submission (from the assessments it received), one for the quality of each student's assessments.
- **Assessment form**: rubric or accumulative; it takes whole points only, so scale criteria that use halves (×2), the workshop normalizes it. Self-assessment is an option.
- **Allocation**: random allocation, or scheduled to run when the submission phase ends (needs the site's cron, which real sites have). moodle-mcp has no tool for it: the person runs it, or you do with the `browser_*` tools after saying so.
- **Teams reviewing teams**: "Separate groups" allocates reviewers from the same group, the opposite of peer review between teams. Use "Visible groups" with "Prevent reviews by peers from the same group".
- `get_workshop` shows the phase, submissions and assessments; `assess_workshop_submission` assesses as the person.

## Lesson, glossary, wiki, database

`create_activity` creates them, but moodle-mcp 0.3.0 has no tools for their insides: a lesson's pages and jumps, a database's fields and templates. Plan them with the person, then the person builds them, or you do with the `browser_*` tools after saying so. A lesson with branches must have every path end somewhere: a dead end blocks the student.

- **Glossary**: entries approved before they show, auto-linking of terms across the course.
- **Wiki**: collaborative (one per group with group mode) or individual.
- **Database**: define its fields and templates before opening it to students.

## Forums as activities

| Forum type | For |
| --- | --- |
| Standard forum for general use | Open discussion, questions |
| Q and A forum | Everyone posts before seeing the others' answers |
| Each person posts one discussion | Everyone presents their work, others comment |
| A single simple discussion | One focused debate |

Graded participation: "Whole forum grading" (points or a scale), graded with `grade_forum_user` (see `grading`). Group mode for team forums. Running a forum day to day is the `forums` skill.

## Choice, feedback, H5P, SCORM

- **Choice**: one question with a purpose (sides for a debate, a project topic); "allow choice to be updated" if they may change their mind; a limit per option to balance groups.
- **Feedback** (survey): no right answers; "anonymous" when honesty matters more than follow-up.
- **H5P**: check which content types the site has before planning one.
- **SCORM**: the `scorm` skill.

## What connects activities

- **Completion** (`completion` in `create_activity` and `update_activity`): `manual`, or `conditions` (view, receive a grade, a passing grade, submit). The course must track completion: if it doesn't, `update_course` turns it on, with the person's yes.
- **Restrictions** (`restrictions`): conditions by `date`, by another activity's `completion` or `grade` (percent), by `group`; `match` all or any; `hidden` while unmet, or shown greyed with the conditions. Say in the section summary what unlocks what, or students think content is missing. `edit_section` restricts a whole section.
- **Groups and groupings**: create them before the activities that use them (`create_group`, `set_group_members`, `create_grouping`, `set_grouping_groups`). Separate groups hide other teams' work; visible groups show it.
- **Badges**: no tool in moodle-mcp 0.3.0. Draft what the badge certifies and its criterion (an activity's completion, the course's, or manual issue), and the person creates it in "Manage badges".

After setting them up, walk every path with the person: what a locked activity says, each branch, each phase.
