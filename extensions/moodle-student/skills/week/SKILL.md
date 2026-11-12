---
name: week
description: A quick look at what a student has this week in their Moodle courses - deadlines in the next days including overdue ones still accepted, what is locked, unread notifications - in a short list by day, only reading. Use when the person asks what they have to do or hand in this week, today or in the next few days.
---

Look at the person's Moodle courses on the active site and tell them what they have to do within the days the person asks about (the next 7 if they don't say):

1. `list_deadlines` for the coming days, across their courses: what's due and when, including what's overdue but still accepted.
2. `list_pending` in each course in progress: what's left, and whether each can be opened now or is locked by something else first.
3. Unread notifications (`list_notifications`, unread only), in one line each: new grades and feedback, announcements; skip this step when the tool isn't there (the server limited to some courses leaves it out). Mark them read (`mark_notifications_read`) only if the person asks.

Answer as a short list grouped by day, most urgent first, naming the course of each item, and point out anything that unlocks other work. For everything left beyond this week, in order of dates and dependencies, the `plan-my-work` skill. Only read: change nothing.
