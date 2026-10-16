---
name: class-progress
description: Read how a Moodle class is doing with moodle-mcp - completion, grades, submissions, quiz results, who hasn't accessed the course, participation and views - telling what Moodle says from what it doesn't, and write to the students concerned with the person's yes. Use when the person asks who's falling behind, how a group or an activity is going, or for a progress report.
---

# The class's progress in Moodle

What the data means for teaching is the person's reading (or the agent's teaching knowledge); this skill is where each signal is in Moodle and what it does and doesn't say. Read it live each time: a student's situation changes from one day to the next.

## Where each signal is

| Question | Tool | Careful with |
| --- | --- | --- |
| Who did each activity | `get_completion_report` (a group with `group`) | Only activities that track completion; manual completion is what the student ticked |
| Grades so far | `get_grader_report` | An empty grade may be "not submitted" or "not graded yet" |
| An assignment's submissions | `get_submissions` | `none` is nothing at all; `new` started but empty; `draft` not submitted |
| A quiz's results | `get_quiz_results` (`responses` for each answer) | In-progress attempts count as attempts, without a grade |
| Who hasn't entered the course | `list_participants` with `inactiveSince` | Entering isn't working |
| Who took part in an activity | `get_participation_report` (`action`: view or post) | Counts actions, not quality |
| Which activities are looked at | `get_activity_report` | Counts only, no one's name |
| What a student did, when | `get_course_logs` with `user` | Detailed: only when the person asks about one student |
| What's waiting, per activity | `get_activities_overview` (Moodle 5) | Submissions and what needs grading, not per student |

Deadlines are in `list_deadlines` and each activity's settings: "overdue" is relative to a student's own dates (overrides and extensions in `get_submissions`).

## Reporting it

- Counts and patterns first ("6 of 24 haven't submitted the first practice; 4 of them haven't entered since 1 October"), then who, by alias, when the person needs it.
- What Moodle says ("hasn't submitted X") apart from what you infer ("the deadline may have been tight"): both, but never the second as if read.
- Several students stuck on the same activity points at the activity, not at them: say which.
- Aliases are the only names you have: the person resolves them on their own computer. Never try to find out who they are.

## Acting on it

- A reminder to those behind: `message_participants` (to aliases, a group, or those inactive since a date) with a plain text, no aliases in it; confirm recipients and text.
- A class-wide issue: an announcement (see `forums`).
- A student's extra time: `grant_extension` (assignments) or `set_quiz_override` (quizzes), with the person's yes.
- `override_completion` marks an activity complete for a student (shown as an override): only when the person says.
