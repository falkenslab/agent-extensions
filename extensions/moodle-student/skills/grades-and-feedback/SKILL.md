---
name: grades-and-feedback
description: Read a student's grades and feedback in Moodle with moodle-mcp - the grade report with weights and contributions, each assignment's grade, comments and feedback files, each quiz attempt's review, and what's still to be graded - and explain where the person stands. Use when the person asks how they're doing, what they got, what the teacher said, or how much an activity counts.
---

# Grades and feedback

## Where they are

- **The whole course**: `get_my_grades` gives each grade item (with its activity id), category and the course total, with grade, range, percentage, weight, letter, feedback and contribution to the total, as Moodle shows them.
- **An assignment**: `get_assignment` gives the grade, the teacher's comments and feedback files (`download_file` saves them); with a rubric, the levels the teacher chose.
- **A quiz**: `get_quiz_info` lists the attempts and their grades; `get_attempt_review` gives one attempt's marks, feedback and right answers, as far as the quiz shows them.
- **A forum, lesson, SCORM**: their grades are in `get_my_grades`.

## Reading them right

- **Not graded yet** isn't a zero: an empty grade with a submission means the teacher hasn't graded it; an essay question waits for grading by hand.
- **Hidden grades**: with a marking workflow, a grade appears only when the teacher releases it. Some quizzes show marks or right answers only after they close.
- **Weight and contribution**: how much an item counts toward the total is its weight (or, with Natural aggregation, its maximum over the total); "contribution" is what it adds now. Say what Moodle gives; don't recompute a final grade Moodle doesn't show.
- **Overridden or excluded** items: the report may show a grade changed in the gradebook, or left out of the total.

## Explaining it

Lead with where the person stands (the course total and what's still to come), then what each piece of feedback asks them to change. Quote the teacher's feedback as written. A doubt about a grade goes to the teacher privately (`send_message`), never in a public forum.
