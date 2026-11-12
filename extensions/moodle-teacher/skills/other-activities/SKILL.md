---
name: other-activities
description: Build Moodle's other activities with moodle-mcp and fill their insides - book chapters, lesson pages and jumps, glossary entries and categories, wiki pages, database fields, templates and entries, feedback and questionnaire questions, choice options and results, board columns, H5P packages, and forum types as activities. Use when a course needs one of these activities or its contents change; workshops, attendance and assignments, quizzes and SCORM have their own skills.
---

# Other activities

Check the type is offered first (`get_site_info` with `courseId`), create it hidden (`create_activity`), learn its form's field names from `get_activity_settings` on one like it, and follow the `publishing` skill. `create_activity` creates these activities empty; their insides have their own tools below. Build them hidden, read them back with the tool named for each, and show them with the person's yes. Workshops are the `workshop` skill, attendance the `attendance` skill, and what connects activities (completion, restrictions, groupings, badges) the `completion-and-restrictions` skill.

## Book

- `add_book_chapter` (title, HTML content with its images in `embed`, subchapter or not, hidden while not ready), `edit_book_chapter`, `move_book_chapter`, `set_book_chapter_visibility`.
- `delete_book_chapter` deletes a chapter with its files, and a chapter's subchapters with it: say what goes, and the server asks the person itself.
- `list_book_chapters` reads them back in order. The book numbers its chapters itself: titles without "1.".

## Lesson

- Add every page first with `add_lesson_page` (content pages with their buttons, question pages with answers, responses, scores and jumps, clusters and branch ends), then set the jumps that point forward with `edit_lesson_page`, since a jump to a page that doesn't exist yet is refused.
- `move_lesson_page` moves a page after another (0: first): jumps by page id still lead to the same pages; "next page" and "previous page" follow the new order.
- `delete_lesson_page` deletes a page and leaves other pages' jumps to it as Moodle leaves them; the server asks the person itself. Check those jumps afterwards.
- `get_lesson_pages` reads the whole lesson back: walk every path with it, since a branch with no end blocks the student.

## Glossary

- Entries: `add_glossary_entry`, `edit_glossary_entry`, `delete_glossary_entry` (the server asks the person itself); where the glossary needs approval, they show once approved (`set_glossary_entry_approved`). `list_glossary_entries` reads them back (`pending` for those waiting for approval).
- Categories: `list_glossary_categories` gives their ids, which entries take; `add_glossary_category` adds one (with `autoLink`, Moodle links its name across the course).
- Reuse: `export_glossary` saves the approved entries as Moodle's XML, which `import_glossary` brings into another glossary as the person's own entries. The export holds what participants wrote as is: only with names in clear.
- Auto-linking of entries across the course is a glossary setting (`update_activity`).

## Wiki

Collaborative (one per group with group mode) or individual, a setting of the wiki. `create_wiki_page` and `edit_wiki_page` seed it (`[[Title]]` links to another page; a subwiki's first page has the wiki's first page title); `list_wiki_pages` and `get_wiki_page` read it back.

## Database

- **Fields first**: `add_database_field`, `edit_database_field` (its type can't change; renaming renames its tag in the templates), `delete_database_field` (what every entry has in it goes too; the server asks the person itself). Or a preset: `list_database_presets`, then `apply_database_preset`, which deletes the fields it doesn't have, with their content; the server asks the person first. `get_database_fields` reads them back.
- **Then its templates**: `set_database_template` (list, single, add form, search; `[[field]]` and `##tag##`), before opening it to students. `get_database_templates` reads what was saved, or Moodle's default.
- **Entries**: `list_database_entries`, `add_database_entry`, `edit_database_entry`, `delete_database_entry` (the server asks the person itself), and `set_database_entry_approved` where it needs approval.
- **Import and export**: `import_database_entries` adds entries from a local CSV with the fields' names as headers, with the person's yes; `export_database_entries` saves them to a CSV, which holds what participants wrote as is: only with names in clear.

## Feedback

- Questions: `add_feedback_item`, `edit_feedback_item`, `move_feedback_item`, `delete_feedback_item` (with the answers given to it; the server asks the person itself). `get_feedback_items` reads them back in order.
- Templates: `list_feedback_templates` and `use_feedback_template` to start from one; `save_feedback_template` saves this one's questions as a template (the course's, or public with a manager's rights), with the person's yes; `delete_feedback_template` deletes one, and the server asks the person itself.
- "Anonymous" is a setting: with it, the responses (`get_survey_results`) don't say who gave them.

## Choice

One question with options (`update_activity` with the fields from `get_activity_settings`). "Allow choice to be updated" lets students change their answer; a limit per option closes it once that many chose it; publishing results decides what students see of each other's answers. `get_choice` reads it, and `get_choice_results` the responses (see `class-progress`).

## Questionnaire and board

Two activities that come from plugins: they exist only where the site has them installed (`create_activity` says so when it isn't).

- **Questionnaire**: like feedback, with more question types. `get_questionnaire_questions` reads them; `add_questionnaire_questions` adds after those there, in order: yes/no, text, essay, radio, check, drop, rate, date, numeric, label, and `pagebreak` between pages. Once someone has answered, adding is refused unless `evenWithResponses` (the server asks the person): their responses stay without the new questions.
- **Board**: notes in columns. A new board comes with three columns all titled "Heading": right after `create_activity`, `set_board_columns` with the person's titles. `add_board_column`, `edit_board_column` and `remove_board_column` for one; renaming keeps a column's notes, and a column with notes is removed only with `deleteNotes`, which the server confirms: its notes, comments and ratings go for good. `get_board_columns` reads them back, with how many notes each has.

## H5P

An `.h5p` package (the person's, or one another extension built for them) becomes an H5P activity with `create_activity`, `type: "h5pactivity"` and the package as the only path in `files`, hidden as always; its settings (attempts tracked, grade, which attempt counts) come from `get_activity_settings` on one like it. A package without its libraries plays only where the site has its content type: `list_h5p_content_types` (with the course) lists the ones it can run, each with its main library and version, and whether the person may install new ones; check it before a package is built, and its main library and version against the package's. Once created, `get_h5p_activity` says the content type Moodle read, and opening it shows whether it plays. If the site lacks the type, say so and that an administrator installs it (Moodle also downloads them); never look for a way around it.

## Forums as activities

| Forum type | What Moodle does |
| --- | --- |
| Standard forum for general use | Anyone starts discussions and replies |
| Q and A forum | A student sees the others' replies only after posting their own |
| Each person posts one discussion | Each student starts exactly one discussion; anyone replies |
| A single simple discussion | One discussion, set by the teacher; students only reply |

Graded participation is "Whole forum grading" (points or a scale), graded with `grade_forum_user` (see `grading`); group mode gives each group its own discussions. Running a forum day to day is the `forums` skill.

## SCORM

The `scorm` skill.
