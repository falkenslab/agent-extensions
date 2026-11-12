---
name: other-activities
description: Set up Moodle's other activities with moodle-mcp so they behave as intended - workshop (peer assessment), its phases and its assessment form, lesson, glossary, wiki, database, forum types and whole-forum grading, choice, feedback survey, questionnaire, board, attendance, H5P, SCORM - and the pieces that connect activities - completion, access restrictions, groups and groupings, badges. Use when a course needs something other than a resource, an assignment or a quiz, or when activities must unlock, track or group.
---

# Other activities, and what connects them

Check the type is offered first (`get_site_info` with `courseId`), create it hidden (`create_activity`), learn its form's field names from `get_activity_settings` on one like it, and follow the `publishing` skill. Every activity's description says what to do, how, by when and how it's assessed.

## Workshop: peer assessment

- **Phases**: setup, submission, assessment, grading evaluation, closed. The dates ("open for submissions from", "open for assessment from" and their deadlines) are what open and close each phase for students; with them set, `set_workshop_phase` switching early is harmless, without them it's the only switch. Moodle allocates nothing and computes no grades on its own when the phase changes. Changing the phase changes what students can do: `set_workshop_phase` only with the person's yes.
- **Two grades**: one for the submission (from the assessments it received), one for the quality of each student's assessments.
- **Assessment form**: its strategy (accumulative, comments, number of errors, rubric) is the workshop's setting (`update_activity`); `get_workshop_assessment_form` reads the form and `set_workshop_assessment_form` replaces its aspects, assertions or criteria in order. A rubric's levels take grades from 0 to 100; accumulative takes whole points only, so scale criteria that use halves (×2), the workshop normalizes it. Once there are assessments it's refused unless `evenIfAssessed`, which the server confirms with the person: grades already given stay as they were. Self-assessment is an option.
- **Allocation**: `allocate_workshop_randomly` (reviews per submission or per reviewer, keeping the current ones, with or without self-assessment, excluding peers of the same group if asked), `schedule_workshop_allocation` to have Moodle do it when the submissions deadline passes (it never runs without one), or by hand with `allocate_workshop_reviewer`. `get_workshop_allocation` shows who reviews what; read it after allocating, and report the problems Moodle lists (not enough reviewers). Allocating gives students work: confirm first.
- **Teams reviewing teams**: "Separate groups" allocates reviewers from the same group, the opposite of peer review between teams. Use "Visible groups" with "Prevent reviews by peers from the same group".
- `get_workshop` shows the phase, submissions and assessments; `assess_workshop_submission` assesses as the person: only the assessment they approved.

## Book, lesson, glossary, wiki, database, feedback

`create_activity` creates them empty; their insides have their own tools. Plan them with the person, build them hidden, and read them back before showing them.

- **Book**: `add_book_chapter` (title, HTML content with its images in `embed`, subchapter or not, hidden while not ready), `edit_book_chapter`, `move_book_chapter`, `set_book_chapter_visibility`; `list_book_chapters` reads them in order.
- **Lesson**: add every page first with `add_lesson_page` (content pages with their buttons, question pages with answers, responses, scores and jumps, clusters and branch ends), then set the jumps that point forward with `edit_lesson_page`, since a jump to a page that doesn't exist yet is refused. `get_lesson_pages` reads the whole lesson: walk every path with it, since a branch with no end blocks the student.
- **Glossary**: entries approved before they show (`set_glossary_entry_approved`), auto-linking of terms across the course; `add_glossary_entry`, categories, and `import_glossary` and `export_glossary` to reuse one.
- **Wiki**: collaborative (one per group with group mode) or individual; `create_wiki_page` and `edit_wiki_page` to seed it.
- **Database**: fields first (`add_database_field`, or a preset: `list_database_presets`, then `apply_database_preset`, which deletes fields it doesn't have, with their content; the server asks the person first), then its templates (`set_database_template`: list, single, add form, search; `[[field]]` and `##tag##`), before opening it to students. `list_database_entries` and `set_database_entry_approved` once they post.
- **Feedback**: its questions with `add_feedback_item`, `edit_feedback_item` and `move_feedback_item`, or a saved template (`list_feedback_templates`, `use_feedback_template`).

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
- **H5P**: an `.h5p` package (the person's, or one another extension built for them) becomes an H5P activity with `create_activity`, `type: "h5pactivity"` and the package as the only path in `files`, hidden as always; its settings (attempts tracked, grade, which attempt counts) come from `get_activity_settings` on one like it. A package without its libraries plays only where the site has its content type: **`list_h5p_content_types`** (with the course) lists the ones it can run, each with its main library and version, and whether the person may install new ones; check it before a package is built, and its main library and version against the package's. Once created, `get_h5p_activity` says the content type Moodle read, and opening it shows whether it plays. If the site lacks the type, say so and that an administrator installs it (Moodle also downloads them); never look for a way around it.
- **SCORM**: the `scorm` skill.

## Questionnaire, board, attendance

Three activities that come from plugins: they exist only where the site has them installed (`create_activity` says so when it hasn't).

- **Questionnaire**: like feedback, with more question types. `get_questionnaire_questions` reads them; `add_questionnaire_questions` adds after those there, in order: yes/no, text, essay, radio, check, drop, rate, date, numeric, label, and `pagebreak` between pages. Once someone has answered, adding is refused unless `evenWithResponses` (the server asks the person): their responses stay without the new questions.
- **Board**: notes in columns. A new board comes with three columns all titled "Heading": right after `create_activity`, `set_board_columns` with the person's titles. `add_board_column`, `edit_board_column` and `remove_board_column` for one; renaming keeps a column's notes, and a column with notes is removed only with `deleteNotes`, which the server confirms: its notes, comments and ratings go for good.
- **Attendance**: sessions, then attendance taken in each. `add_attendance_sessions` adds one, or a weekly series on given weekdays until a date (`repeatOn`, `repeatUntil`, `repeatEveryWeeks`), one per group with `groupIds`; `list_attendance_sessions`, `edit_attendance_session`, and `delete_attendance_session`, which the server confirms. To take it: `get_session_attendance` gives the session's statuses and who's in it, `take_attendance` sets a status per student (and remarks) and leaves the rest as they were; every mark is checked before any is saved. Students appear as aliases while the server pseudonymizes, and remarks that name one are refused. `get_attendance_report` gives each student's counts and percentage over the sessions taken, which is what Moodle grades. Taking attendance is the person's: never mark anyone without their word for each.

## What connects activities

- **Completion** (`completion` in `create_activity` and `update_activity`): `manual`, or `conditions` (view, receive a grade, a passing grade, submit). The course must track completion: if it doesn't, `update_course` turns it on, with the person's yes.
- **Restrictions** (`restrictions`): conditions by `date`, by another activity's `completion` or `grade` (percent), by `group`; `match` all or any; `hidden` while unmet, or shown greyed with the conditions. Say in the section summary what unlocks what, or students think content is missing. `edit_section` restricts a whole section.
- **Groups and groupings**: create them before the activities that use them (`create_group`, `set_group_members`, `create_grouping`, `set_grouping_groups`). Separate groups hide other teams' work; visible groups show it.
- **Badges**: draft with the person what it certifies and its criterion, then `create_badge` (name, plain-text description and a local PNG, JPEG or GIF image of 256 KB at most; it starts disabled), `set_badge_criteria` (activities completed, the course completed with a minimum grade, or awarded by hand by some roles) and, last, `set_badge_enabled`. Enabling it awards it at once to everyone who already meets it, and they're told; criteria can't change after that while anyone has it, so check them first. `award_badge` awards a manual one.

After setting them up, walk every path with the person: what a locked activity says, each branch, each phase.
