---
name: week
description: What this week holds in the Moodle courses the person teaches - the dates coming up, what is waiting to be graded, and unread notifications - in a short list by day, only reading. Use when the person asks what is due or pending this week (or in the next days), or invokes it to start the week.
---

Look at the Moodle courses the person teaches on the active site and tell them what this week holds, within the days the person asks about (the next 7 if they don't say):

1. The course dates coming up: `list_events` across their courses (activities' due and close dates, course events).
2. What's waiting for them: `get_activities_overview` per course where Moodle offers it (Moodle 5: what needs grading); otherwise submissions to grade (`list_assignments`, then `get_submissions`) and quiz questions to grade by hand (`list_questions_to_grade`).
3. Unread notifications (`list_notifications`, unread only), in one line each.

Answer as a short list grouped by day, most urgent first, naming the course of each item. Only read: change nothing.
