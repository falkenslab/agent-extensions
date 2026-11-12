---
name: to-grade
description: What is waiting to be graded in one Moodle course or in all the person teaches - submissions not graded yet, quiz questions graded by hand, whole-forum grades - as a table with how long the oldest has waited, only reading, then offering to start. Use when the person asks what they have to grade or correct.
---

List what's waiting for the person to grade on the active Moodle site, in the course the person names (or in every course they teach, if they name none). In each course:

1. `get_activities_overview` first, where Moodle offers it (Moodle 5): its "Needs grading" per activity is the count. Where it fails (Moodle 4.x), count assignments by hand: `list_assignments`, then `get_submissions` for each, counting the submissions not graded yet.
2. For the assignments with work waiting, `get_submissions` gives how long the oldest has waited.
3. Quizzes: `list_questions_to_grade` for questions graded by hand (essays).
4. Forums graded as a whole: `get_forum_grades`, when there are any.

Answer as a table: course, activity, how many to grade, oldest since. Only read: change nothing. Then offer to start with the oldest, following the `grading` skill.
