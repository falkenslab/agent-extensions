---
name: course-content
description: Put learning content into a Moodle course with moodle-mcp - choose the resource (page, book, file, folder, URL, text and media area, section summary), write it as HTML Moodle keeps, embed images and upload files, and edit existing content without breaking it. Use whenever notes, documents, links or section texts go into Moodle or change there; activities have their own skills.
---

# Content in Moodle

What the content says is the person's (or comes from wherever the agent's teaching knowledge does); this skill is how it lands in Moodle intact. New content goes up hidden first: see the `publishing` skill.

## Which resource

| Content | Moodle resource | How |
| --- | --- | --- |
| Notes of reasonable length | Page (`page`) | `create_activity` with `content` (HTML) |
| Long notes in parts | Book (`book`) | `create_activity` creates it empty, then `add_book_chapter` per chapter (HTML `content`, images in `embed`, `subchapter` for a part of the one before); `list_book_chapters` reads them back |
| A document to download (a syllabus, a template, notes as PDF) | File (`resource`), or folder (`folder`) for several | `create_activity` with `files` (absolute local paths; the first is a file resource's main one) |
| An external reference | URL (`url`) | `create_activity` with `url`, and a `description` saying what to look at and why |
| A short note between activities on the course page | Text and media area (`label`) | `create_activity` with `content`; no `name` needed |
| What a section is about and the order to follow | The section's summary | `add_section` or `edit_section` with `summary` |

Check the type is offered in this course first (`get_site_info` with `courseId`).

## HTML that survives

- Write the content as HTML, never as text typed into an editor: headings, lists and code blocks come through only as markup.
- Headings start at `<h2>` (the activity's name is the page's `<h1>`), in order, without skipped levels.
- Code and commands in `<pre><code>`, with HTML entities for `<`, `>` and `&`: they can be copied and keep their indentation.
- Images: local files in `embed`, named in the HTML by file name (`<img src="flow.png" alt="...">`); moodle-mcp uploads them into the activity. Alt text says what the image shows; empty only for decoration.
- Links say where they go ("the official documentation of Docker volumes"), never "click here". Tables only for tabular data, with `<th>` headers.
- **Check it before sending**: `validate_html` with the HTML and its `embed` reports tags left open, what Moodle's cleaning will remove (scripts, `<style>`, frames, forms, `onclick`), and images named but not embedded or embedded but not named. Fix what it reports; it's approximate, so still read the result back.

## Editing what's there

1. Read it first: `get_activity_content` for the text, `get_activity_settings` for the rest (a resource's or folder's files are listed there by path).
2. Change only what's needed: `update_activity` changes only what you give (`content`, `description`, `name`, `url`, `files` to add, remove or replace). Keep the person's wording when a correction does.
3. Read it back and say what changed and why.

## The course calendar

- **Course events** (an exam day, a talk, a deadline that isn't an activity's): `create_event` with a name, a `start` in ISO 8601 with its time zone (`2026-11-03T10:00:00+01:00`) and, optionally, `durationMinutes` and a description. Every participant sees it in their calendar: say what goes in before calling it.
- **What's coming**: `list_events` (one course with `courseId`, every course without it) gives course events, activities' dates and the person's own events; `get_event` reads one.
- **Changing one**: `update_event` changes only what's given; a new start keeps its length unless a new one is given, and `wholeSeries` changes every event of a repeated one. `delete_event` removes it, after moodle-mcp asks the person itself.
- **An activity's dates** (an assignment's due date, a quiz's close) aren't events to edit: they show in the calendar because the activity has them, and they change in the activity (`update_activity`).

## Good practice

- Descriptive names ("Unit 2 notes: Dockerfiles and building images"), not "Unit 2" or "Page 1": they're what students see in the course index and the gradebook.
- Place it where it belongs: `create_activity` adds at the end of a section; `edit_activity` with `beforeActivityId` moves it into place.
- A file name is what students download: name local files before uploading them, without spaces or the person's private folder names.
