---
description: What's waiting to be graded in a Moodle course, or in all of them
argument-hint: "[course name]"
---

List what's waiting for the person to grade on the active Moodle site, in the course named "$ARGUMENTS" (or in every course they teach, if none is named):

- Assignments: `list_assignments`, then `get_submissions` for each, counting the submissions not graded yet, and how long the oldest has waited.
- Quizzes: `list_questions_to_grade` for questions graded by hand (essays).
- Forums graded as a whole: `get_forum_grades`, when there are any.

Answer as a table: course, activity, how many to grade, oldest since. Only read: change nothing. Then offer to start with the oldest, following the `grade-with-rubric` skill.
