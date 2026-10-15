---
name: course-check
description: Check a Moodle course for what's broken or inconsistent in Moodle itself with moodle-mcp - restrictions pointing nowhere, dates out of order or from last year, empty or forgotten hidden sections, quizzes that show answers during the attempt, assignments that can't take what they ask or save feedback, missing rubrics, gradebook weights, completion - and prepare a course for a new term. Use when the person asks to review, audit or tidy a course, or to get it ready for a new edition.
---

# Checking a course in Moodle

These are the checks only Moodle can answer. Whether the course teaches well is another review (the person's, or the agent's teaching knowledge); this one finds what's broken, stale or inconsistent, and reports it by impact.

## Read it once

`get_course_structure` with `details: true` (dates and restriction texts), `get_gradebook_setup`, and `get_activity_settings` for the activities the checks below need. For a large course, a sample per section and every graded activity.

## What to check

- **Locked for good**: a restriction on an activity that no longer exists, or on a completion the activity can't reach (no completion tracking, a condition it doesn't have). Students can never open it.
- **Dates**: an activity due before the material it needs is available; a quiz open before its prerequisite unlocks; deadlines out of the calendar's order; dates from a past edition.
- **Hidden or empty**: sections with nothing in them; hidden activities nobody remembers (drafts never shown, or shown ones hidden by mistake); stealth activities linked from nowhere.
- **Assignments**: submission types or accepted files that don't match the statement; feedback comments off while graded by hand; graded by hand with no rubric or guide (`get_rubric`); a maximum grade that doesn't match the rubric's top levels.
- **Quizzes**: review options showing right answers during or right after the attempt in a graded test; no questions or a zero total (`get_quiz_structure`); random slots with fewer ready questions than drawn; attempts or time limits that contradict the description.
- **Gradebook**: weights that don't add up to the person's scheme; graded activities outside their category; zero maximums; overridden grades nobody remembers (see `gradebook`).
- **Completion**: tracking on in the course but key activities without conditions; or conditions students can't meet.
- **Links and files**: external URLs that fail (checkable from the agent's web tools where reachable; say "couldn't check" when blocked or behind a login, not "broken"); files and pages linking to another course or site.

## Reporting

By impact, not as a flat checklist: what blocks students first (a locked unit, a quiz with no questions), then what misleads them (wrong dates, a statement asking for what can't be uploaded), then tidiness. For each: what's wrong, where (section, activity), and what fixing it would take. Fixes are writes: propose them, and make them only with the person's yes (see `publishing`).

## A new edition

When the course is for a new term (copied, restored or reused):

- **Dates**: list every dated activity (open, due, cut-off, close) and ask the person for the new calendar. `reset_course` with only `start` moves the course start and every activity's dates with it, deleting nothing; then adjust single dates with `update_activity`.
- **Last edition's people**: groups, groupings and overrides from the previous cohort; forum posts and announcements that mention last year.
- **Students' data**: `reset_course` deletes only what's named in `delete` (submissions, attempts, posts, grades) and unenrols only `unenrolRoles`, and can't be undone: only when the person asks, confirming each item, after a backup (`backup_course`, see `copy-and-restore`).
