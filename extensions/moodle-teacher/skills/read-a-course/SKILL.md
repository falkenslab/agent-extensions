---
name: read-a-course
description: Read a Moodle course's real state with moodle-mcp before acting on it - what the person can do there, its sections and activities, restrictions and completion, dates, the gradebook and what changed lately - instead of guessing from names or from memory. Use before any complex task in a course (grading, building, auditing, reporting), and whenever unsure what a course holds or allows.
---

# Reading a course

Moodle's current state is the truth: never infer a course's structure, restrictions or dates from an activity's name, from memory or from notes of an earlier session. Read what the task needs, and stop there.

## Getting started and recovering

- **The session**: when a tool reports a missing or expired session, call `login`: it opens a window at the site's login page where the person logs in themselves (the server never sees their password), and returns who is logged in. `logout` ends Moodle's session so another account can log in, only when the person asks.
- **Watching**: `show_browser` shows the browser so the person can watch the tools work, and hides it again; only when they ask.
- **Diagnosing**: `server_info` gives the server's version and its effective configuration (the active site, the role, read-only access, the student data level, the browser) and where each setting came from. When a tool or a setting seems missing, read it there before anything else, and tell the person what limits it: widening it is theirs, in the extension's settings.
- **After a crash or a lost call**: when a write fails, times out or the browser crashes, read back whether it landed (the activity, the post, the grade) before retrying, and retry once only if it isn't there. The `browser` setting chooses the browser, and `switch_after_crashes` has the server move to another installed browser after that many crashes in a session: suggest them to the person when the browser keeps crashing.
- **No tool for the task**: the `browser_*` tools work in Moodle's pages as the person. Use them only where no moodle-mcp tool covers the task (a rubric's regrade policy, a manual quiz regrade, a late penalty), after saying which task and getting the person's yes, and read the result back with the regular tools. Never for what this extension or the agent leaves out on purpose (enrolment, roles), for what the server refuses (a limit of its settings, a confirmation the person declined), or to get past what pseudonymization hides.

**Other people's data.** The `student_data` setting decides how students and colleagues reach the agent: `pseudonymize` (the default) gives each person a stable alias (`A-…`) per site, redacts their names in texts, and takes aliases back in tools; `block` removes every tool on others' data; `clear` gives names, only for a model that runs on the person's own computer. The agent can tighten it with `configure`, never loosen it. Aliases belong to a site: the same alias on two sites isn't the same person, and the person resolves them on their own computer; never try to find out who one is. What carries names as is only works with names in clear: `export_grades` and `import_grades`, `export_glossary`, `export_database_entries`, a backup with users that isn't anonymized, `download_file` of a student's file, and browser screenshots; the `browser_*` tools also refuse pages that list people while the server pseudonymizes. `save_submission_files` saves submitted files for the agent to read, under aliases and with neutral file names, after the server asks the person; a name written inside a PDF, a document or an image isn't hidden, so say so before they agree.

## What the person can do there

- `get_me` with `courseId`: their roles in the course, and whether they can edit it and grade in it. Don't assume a teacher's usual powers: a non-editing teacher grades but can't build.
- `get_site_info` with `courseId`: the activity and resource types they can add to this course. Only plan types listed there; `create_activity` takes its `type` from here.
- When a tool is missing, the server may be limited by its settings (read-only access, one role): `server_info` says so. Tell the person instead of looking for a way around it.

## The structure

- `get_course_structure` gives sections and activities with ids, types, visibility and restrictions; `details: true` adds each activity's dates and restriction text as the course page shows them (slower: use it when dates matter).
- Read section names and summaries first: they often say the section's goal and the order to follow.
- **The course format** (topics, weeks, or a plugin's: tabs with `onetopic`, tiles with `tiles`, collapsible with `topcoll`, `grid`) is a course setting, `format` in `update_course`'s `settings`. The settings form only accepts the formats the site has installed, so setting one, with the person's yes, is also how to find out it's there; don't tell them it's missing before trying. Changing it keeps the sections and their activities.
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
