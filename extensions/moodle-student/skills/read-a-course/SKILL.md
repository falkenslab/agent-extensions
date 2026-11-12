---
name: read-a-course
description: Read a Moodle course as a student with moodle-mcp - its sections, resources and activities, what's open or locked and why, what counts as done, the files and texts to study, and what changed lately - instead of guessing from names or from memory. Use before working on a course, and whenever unsure what a course holds, what an activity asks or why something can't be opened.
---

# Reading a course as a student

Moodle's current state is the truth: never infer what a course holds, when something opens or what counts as done from an activity's name or from memory. Read what the task needs, and stop there.

## Getting started and recovering

- **The session**: when a tool reports a missing or expired session, call `login`: it opens a window at the site's login page where the person logs in themselves (the server never sees their password), and returns who is logged in. `logout` ends Moodle's session so another account can log in, only when the person asks.
- **Watching**: `show_browser` shows the browser so the person can watch the tools work, and hides it again; only when they ask.
- **Diagnosing**: `server_info` gives the server's version and its effective configuration (the active site, the role, read-only access, the student data level, the browser) and where each setting came from. When a tool or a setting seems missing, read it there before anything else, and tell the person what limits it: widening it is theirs, in the extension's settings.
- **After a crash or a lost call**: when a write fails, times out or the browser crashes, read back whether it landed (the submission, the answer, the post) before retrying, and retry once only if it isn't there. The `browser` setting chooses the browser, and `switch_after_crashes` has the server move to another installed browser after that many crashes in a session: suggest them to the person when the browser keeps crashing.
- **No tool for the task**: the `browser_*` tools work in Moodle's pages as the person. Use them only where no moodle-mcp tool covers the task (a SCORM or H5P player, a page no tool reads), after saying which task and getting the person's yes, and read the result back with the regular tools. Never to get around a restriction, a closed activity, what the server refuses or what pseudonymization hides.

**Other people's data.** The `student_data` setting decides how classmates and teachers reach the agent: `pseudonymize` (the default) gives each person a stable alias (`A-…`) per site, redacts their names in texts, and takes aliases back in tools; `block` removes the tools on others' data; `clear` gives names, only for a model that runs on the person's own computer. The agent can tighten it with `configure`, never loosen it. Aliases belong to a site: the same alias on two sites isn't the same person; never try to find out who one is. What can't be pseudonymized only works with names in clear: `download_file` of a file that belongs to someone's work (a submission's or feedback file, the person's own included, a forum attachment, a database or glossary entry's file), and browser screenshots; the `browser_*` tools also refuse pages that list people while the server pseudonymizes. Teachers' files (a resource, a folder, an assignment's brief) always download. The person's own name stays visible.

## The course

- `list_courses` gives the person's courses (`classification`: in progress, future, past) and, where Moodle tracks it, their progress.
- `get_course_structure` gives sections and activities with ids, types, whether the person can open each one, restrictions and their own completion; `details: true` adds each activity's dates and restriction text as the course page shows them.
- Read section names and summaries first: they often say the order to follow and what's expected.
- A welcome section, a course guide or the announcements forum often holds the rules (how it's graded, late work, participation): read them before deciding something they may already decide.

## Resources and activities

- **Resources** (page, book, file, folder, URL, label) are to read: `get_activity_content` reads a page's or label's text, a book's chapters, a URL's target, or a resource's files as links, and Moodle logs the view (some completions depend on it). `download_file` saves a file to a local folder to read it.
- **Activities** (assignment, quiz, forum, choice, lesson, survey, SCORM, H5P) expect something from the person and are often graded: each has its own skill here.
- An activity's own page says more than its name: `get_assignment`, `get_quiz_info`, `get_choice`, `get_survey`, `get_scorm`, `get_h5p_activity`.

## Locked and done

- A locked activity says why: a date, another activity to complete or pass first, a group. Follow a completion or grade restriction back to what unlocks it: it's the order the teacher meant. Never try to get around one.
- Completion is `manual` (the person marks it: `set_completion`), or automatic on viewing, submitting, receiving a grade or passing. A viewed resource with manual completion isn't done until marked.

## What changed

`get_course_updates` (since a date) shows what's new in the course's activities; `list_notifications` what Moodle told the person. Useful at the start of a session. `mark_notifications_read` marks them all read, only when the person asks.

## Good practice

- Report what you read as read ("the quiz closes on 3 November") and what you infer as inferred.
- Classmates and teachers may reach you as aliases: use them as given, never try to find out who they are.
- Ids belong to a site: after `use_site`, read the course again.
