---
name: read-a-course
description: Read a Moodle course as a student with moodle-mcp - its sections, resources and activities, what's open or locked and why, what counts as done, the files and texts to study, and what changed lately - instead of guessing from names or from memory. Use before working on a course, and whenever unsure what a course holds, what an activity asks or why something can't be opened.
---

# Reading a course as a student

Moodle's current state is the truth: never infer what a course holds, when something opens or what counts as done from an activity's name or from memory. Read what the task needs, and stop there.

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

`get_course_updates` (since a date) shows what's new in the course's activities; `list_notifications` what Moodle told the person. Useful at the start of a session.

## Good practice

- Report what you read as read ("the quiz closes on 3 November") and what you infer as inferred.
- Classmates and teachers may reach you as aliases: use them as given, never try to find out who they are.
- Ids belong to a site: after `use_site`, read the course again.
