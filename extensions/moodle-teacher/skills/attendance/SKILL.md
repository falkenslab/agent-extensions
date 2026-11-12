---
name: attendance
description: Take attendance in Moodle with moodle-mcp through an Attendance activity - its sessions (one, a weekly series, one per group), taking the roll call for a session with each student's status and remarks, and the attendance report with absences and percentages. Use when the person asks to take attendance, pass the register or roll call, add class sessions, or see who has missed classes.
---

# Attendance

Attendance is a plugin activity (`attendance`): it exists only where the site has it installed (`get_site_info` with `courseId` lists it; `create_activity` says so when it isn't). One activity holds the course's sessions and the attendance taken in each; it's created hidden like any other (see `publishing`), and its grade is in the gradebook like any activity's.

## Sessions

- `list_attendance_sessions` lists the activity's sessions by date, with their groups and whether attendance was taken; sessions before the course's start date aren't listed.
- `add_attendance_sessions` adds one session (`start` in ISO 8601 with its offset, `durationMinutes`, ending the same day), or a weekly series: `repeatOn` (weekdays) with `repeatUntil` (the last day, included) and `repeatEveryWeeks`, all at the start's time of day. With `groupIds`, one session for each group (the activity in group mode); without, for all students. Adding sessions changes the course: show the list of dates first and add them with the person's yes.
- `edit_attendance_session` changes one session's start, duration or description (a new start keeps the duration); Moodle doesn't move a session to another group. With the person's yes.
- `delete_attendance_session` deletes a session with the attendance taken in it, and Moodle recalculates the grades. Say what goes before calling it: the server asks the person itself, so don't ask first.

## Taking attendance

1. `get_session_attendance` gives the session's statuses (by acronym and name: present, late, excused, absent, or the site's own set) and who's in it, with what each has now.
2. The person says each student's status: taking attendance is theirs, so never mark anyone without their word for each. Show the marks before saving.
3. `take_attendance` with `marks`: a status per student (and optional remarks); the others keep what they have. Every mark is checked before any is saved: one Moodle wouldn't take refuses them all. Moodle marks the session taken and recalculates the grade.
4. Read back what it returns: the session's attendance as Moodle has it now.

Students appear as aliases while the server pseudonymizes: pass them back as they came. Remarks that name a student are refused: write them without names.

## The report

`get_attendance_report` (one group with `groupId`) gives each student's count of each status over the sessions taken, as a percentage, their points and percentage over taken sessions (what Moodle grades), over all sessions, and the most they can still reach. Sessions before the course's start date don't count. Whether an absence is justified is the status the person set, nothing more: report the counts as Moodle gives them.
