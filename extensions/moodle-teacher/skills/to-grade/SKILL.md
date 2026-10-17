---
name: to-grade
description: What is waiting to be graded in one Moodle course or in all the person teaches - submissions not graded yet, quiz questions graded by hand, whole-forum grades - as a table with how long the oldest has waited, only reading, then offering to start. Use when the person asks what they have to grade or correct.
---

List what's waiting for the person to grade on the active Moodle site, in the course the person names (or in every course they teach, if they name none):

- Assignments: `list_assignments`, then `get_submissions` for each, counting the submissions not graded yet, and how long the oldest has waited.
- Quizzes: `list_questions_to_grade` for questions graded by hand (essays).
- Forums graded as a whole: `get_forum_grades`, when there are any.

Answer as a table: course, activity, how many to grade, oldest since. Only read: change nothing. Then offer to start with the oldest, following the `grading` skill.
