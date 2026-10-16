---
name: plan-my-work
description: Find what a student has left in their Moodle courses with moodle-mcp - pending activities, deadlines and cut-offs, overdue work, what unlocks what, grades so far - and order it into a realistic plan by date and by dependency. Use when the person asks what they have to do, what's due, where they stand in a course, or what to do next.
---

# What's left, and in what order

## Where it is

| Question | Tool | Careful with |
| --- | --- | --- |
| What's left in a course | `list_pending` | Tracked activities not complete, or graded ones without a grade; with whether each can be opened now |
| What's due, across courses | `list_deadlines` (`days` ahead; it includes the last week's overdue ones) | Only what the calendar holds: an activity without a date isn't there |
| Upcoming course events | `list_events` | Course events and activities' dates together |
| Per activity, at a glance | `get_activities_overview` (Moodle 5) | Due dates, submissions, attempts and the person's grades by type |
| Grades so far | `get_my_grades` | Weights and contribution to the total, as Moodle computes them |
| An assignment's own dates | `get_assignment` | Due date, cut-off date (after it nothing is accepted) and any extension |
| A quiz's window | `get_quiz_info` | Open and close dates, time limit, attempts left |

## Ordering it

1. **What can't wait**: due soon or overdue but still accepted (before its cut-off date). Missing a graded submission costs more than being late with a reading.
2. **What unlocks the rest**: activities other activities are restricted on (completion or grade restrictions in `get_course_structure`), even if their own date is later. When date and dependency conflict, say so: the blocking activity goes first.
3. **Then** graded work without a close date, and last the readings that block nothing.

For each item: the course, what it is, the date and how much it counts (from `get_my_grades` or the activity), and whether it can be opened now.

## Good practice

- Dates as Moodle gives them, in the person's time zone; a due date at 00:00 is the end of the day before: say so.
- What Moodle says ("not submitted") apart from what you infer ("you'll need about two hours").
- Plans go stale: read again at the start of each session instead of reusing an old list.
