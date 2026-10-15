---
name: read-a-course
description: Read a Moodle course's real state with moodle-mcp before acting on it - what the person can do there, its sections and activities, restrictions and completion, dates, the gradebook and what changed lately - instead of guessing from names or from memory. Use before any complex task in a course (grading, building, auditing, reporting), and whenever unsure what a course holds or allows.
---

# Reading a course

Moodle's current state is the truth: never infer a course's structure, restrictions or dates from an activity's name, from memory or from notes of an earlier session. Read what the task needs, and stop there.

## What the person can do there

- `get_me` with `courseId`: their roles in the course, and whether they can edit it and grade in it. Don't assume a teacher's usual powers: a non-editing teacher grades but can't build.
- `get_site_info` with `courseId`: the activity and resource types they can add to this course. Only plan types listed there; `create_activity` takes its `type` from here.
- When a tool is missing, the server may be limited by its settings (read-only access, one role): `server_info` says so. Tell the person instead of looking for a way around it.

## The structure

- `get_course_structure` gives sections and activities with ids, types, visibility and restrictions; `details: true` adds each activity's dates and restriction text as the course page shows them (slower: use it when dates matter).
- Read section names and summaries first: they often say the section's goal and the order to follow.
- **Resource or activity.** A page, file, folder, URL, book or label is content to read; an assignment, quiz, forum, workshop or choice expects something from students and is often graded. Don't treat one as the other.
- **Hidden and stealth.** Hidden activities are invisible to students; stealth ones are off the course page but open by link. A hidden activity may be a draft waiting for the person's yes: don't show it without asking.
- `get_activity_settings` reads every setting of one activity (dates, submission types, grade, completion, restrictions) with each field's form name: the names `update_activity` takes. `get_activity_content` reads a page's, book's or label's text, or a resource's files.

## Restrictions and completion

- A restriction (`restrictions` in the settings) is by date, by another activity's completion or grade, by group, or something only Moodle's JSON says. A completion restriction is Moodle's explicit dependency between activities: follow it to understand the order of a unit.
- Never push through a restriction. When one points at an activity that no longer exists, students are locked out for good: report it.
- Completion (`completion`): `none`, `manual` (the student ticks it) or `conditions` (view, receive a grade, a passing grade, submit). A teacher gets no completion of their own in `get_course_structure`: students' completion is in `get_completion_report`.

## Dates, grades and news

- `list_events` and `list_deadlines` give the calendar; an activity's own dates are in its settings.
- `get_gradebook_setup` shows how the final grade is computed (categories, aggregation, weights) without anyone's grades. See the `gradebook` skill.
- `get_course_updates` (since a date) and `get_activities_overview` (Moodle 5: what needs grading, submissions, attempts per activity) are the quickest look at what's new or waiting.
- An announcements forum, a welcome section or a course guide often holds the rules (grading, late work, participation): read them before deciding something they may already decide.

## Good practice

- One call that returns what you need beats many small ones: Moodle pages are slow.
- Report what you read as read ("the quiz closes on 3 November") and what you infer as inferred ("so the unit probably ends that week").
- Ids belong to a site: after `use_site`, read the course again.
