---
description: What's due this week in the Moodle courses you teach, and what's waiting for you
argument-hint: "[days, 7 by default]"
---

Look at the Moodle courses the person teaches on the active site and tell them what this week holds, within the next $ARGUMENTS days (7 if none are given):

1. The course dates coming up: `list_events` across their courses (activities' due and close dates, course events).
2. What's waiting for them: `get_activities_overview` per course where Moodle offers it (Moodle 5: what needs grading); otherwise submissions to grade (`list_assignments`, then `get_submissions`) and quiz questions to grade by hand (`list_questions_to_grade`).
3. Unread notifications (`list_notifications`, unread only), in one line each.

Answer as a short list grouped by day, most urgent first, naming the course of each item. Only read: change nothing.
