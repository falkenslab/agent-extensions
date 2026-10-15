---
name: publishing
description: Put new content in a Moodle course safely with moodle-mcp - hidden first, checked, then shown with the person's yes - and change what students already see in place; one approval per new item, read back after every write. Use whenever something new goes into a course (a section, a resource, an activity, questions, a rubric) or something visible changes.
---

# Publishing in Moodle

Every write in Moodle is a publication: students may see it, and Moodle may tell them about it. The person approves each one, knowing what it is.

## Something new: hidden first

1. **Create it hidden.** `create_activity` creates hidden by default (`visibility: "hidden"`); `add_section` then `edit_section` with `visible: false` for a new section. Say in the approval that it goes up **hidden, to be checked**.
2. **Don't notify.** Activity forms have a "Send content change notification" box: leave it off for a draft (read its field with `get_activity_settings`).
3. **Read it back.** Every write returns what Moodle saved (the course structure, the activity, the grade): check it says what you meant. `get_activity_settings` for the settings, `get_activity_content` for a page's text, `get_quiz_structure` for a quiz's questions.
4. **Have it tried.** Ask the person to open it in Moodle as a student would (a quiz's "Preview", "Switch role to... Student", every link and interactive part, on a phone width), since moodle-mcp works as them and can't see it as a student. Fix what they find, each fix with its approval.
5. **Show it** with `edit_activity` (`visibility: "shown"`) or `edit_section` (`visible: true`), after asking. The same change on several drafts (a whole unit) can share one approval if it names each.

A draft the person doesn't want shown yet stays hidden: say so when you finish, so it isn't forgotten.

## Something students already see

A typo, a date, a broken link: change it in place (`update_activity`, `edit_section`, `edit_post`), with its approval, no draft. But don't change what a graded activity asked once students have answered it (see the `quizzes` and `assignments` skills).

## Approvals

- **One new item per approval**: a section's text, a page, a statement, a set of questions listed one by one, a rubric. Creating a quiz and importing its questions are two approvals.
- **Show what will be published**, not a promise of it: "and then I'll add the questions" hides them from whoever approves.
- **The same setting change on several items** (unlimited attempts on three quizzes) can share one approval naming each item and the exact change.
- **Commitments in the person's name** (a reply time, feedback by a date) are theirs to make: leave them out, or name each one in the approval.

## Good practice

- HTML for Moodle's editors: real headings starting at `<h2>` (Moodle shows the activity's name as the `<h1>`), lists, `<pre><code>` for code. Images go in `embed`, named in the HTML by file name (`<img src="diagram.png" alt="...">`), with alt text that says what they show.
- Deleting (`delete_activity`, `delete_section`, `delete_questions`) loses students' work and can't be undone: never as a shortcut to redo something, and only with an approval that names what goes.
- After a batch of writes, `get_course_structure` once: everything in its section, in order, with the visibility intended.
