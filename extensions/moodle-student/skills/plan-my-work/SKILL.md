---
name: plan-my-work
description: Lay out everything a student has left in their Moodle courses with moodle-mcp - pending activities per course, due and cut-off dates, overdue work still accepted, what unlocks what through restrictions, and how much each counts - ordered by date and by dependency, beyond this week. Use when the person asks what they have left in a course or overall, what to do next, what unlocks what, or where they stand in a course.
---

# What's left, and in what order

This skill reads what Moodle says is left and how it depends on itself; how to study or how long each piece takes is the person's (or the agent's study knowledge). For this week only, at a glance, the `week` skill is quicker.

## Where it is

| Question | Tool | Careful with |
| --- | --- | --- |
| What's left in a course | `list_pending` | Tracked activities not complete, or graded ones without a grade; with whether each can be opened now |
| What's due, across courses | `list_deadlines` (`days` ahead; it includes the last week's overdue ones) | Only what the calendar holds: an activity without a date isn't there |
| Upcoming course events | `list_events`, and `get_event` for one in full | Course events and activities' dates together |
| A course's assignments | `list_assignments` | Every assignment, with or without a date; then `get_assignment` for each one's dates |
| Per activity, at a glance | `get_activities_overview` (Moodle 5) | Due dates, submissions, attempts and the person's grades by type |
| Grades so far | `get_my_grades` | Weights and contribution to the total, as Moodle computes them |
| An assignment's own dates | `get_assignment` | Due date, cut-off date (after it nothing is accepted) and any extension |
| A quiz's window | `get_quiz_info` | Open and close dates, time limit, attempts left |
| What unlocks what | `get_course_structure` (`details: true`) | Each activity's restrictions: another activity's completion or grade, a date, a group |

## Laying it out

1. **By date**: what's due, from the nearest, with its due date and its cut-off date; overdue work stays on the list while its cut-off date hasn't passed, and goes off it when it has (Moodle accepts nothing after).
2. **By dependency**: an activity that others are restricted on (a completion or grade restriction) goes before them, whatever its own date; when a date and a dependency disagree, say so.
3. **Without a date**: pending activities with no due date, after the dated ones, as Moodle lists them.

For each item: the course, what it is, its dates, how much it counts (from `get_my_grades` or the activity), and whether it can be opened now or what locks it. Which to do first among items with no date or dependency between them is the person's call.

## Good practice

- Dates as Moodle gives them, in the person's time zone; a due date at 00:00 is the end of the day before: say so.
- What Moodle says ("not submitted") apart from what you infer.
- Lists go stale: read again at the start of each session instead of reusing an old one.
