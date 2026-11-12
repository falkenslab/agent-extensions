---
name: completion-and-restrictions
description: Connect a Moodle course's activities with moodle-mcp - activity completion conditions, access restrictions (by date, by another activity's completion or grade, by group) on activities and sections, groupings an activity is limited to, a student's completion overridden by hand, and badges with their criteria. Use when activities must unlock one another, be tracked as done, open only to a group, or award a badge.
---

# Completion, restrictions and badges

These settings decide what a student sees, when, and what counts as done: a mistake locks students out or marks them done when they aren't. Read what's there first (`get_course_structure`, `get_activity_settings`), change it with the person's yes, and read it back.

## Activity completion

- `completion` in `create_activity` and `update_activity`: `none`, `manual` (the student ticks it), or `conditions` (view, receive a grade, a passing grade, submit). A passing grade needs the activity's grade to pass set.
- The course must track completion: if it doesn't, `update_course` turns it on, with the person's yes.
- Students' completion is in `get_completion_report`. `override_completion` sets one student's completion of an activity by hand (shown as an override): only when the person says, for that student.
- Course completion (the whole course done) is the `course-check` skill's.

## Access restrictions

- `restrictions` in `create_activity` and `update_activity`: by `date`, by another activity's `completion` or `grade` (percent), by `group`; `match` all or any; `hidden` while unmet, or shown greyed with the conditions.
- `edit_section` restricts a whole section the same way.
- A completion restriction needs the activity it points at to track completion with a condition it can reach; one pointing at an activity that no longer exists locks students out for good.
- Say in the section summary what unlocks what, or students think content is missing.

## Groups and groupings

- Groups and groupings exist before the activities that use them: creating and filling them is the `participants-and-groups` skill's.
- An activity uses them through its group mode (no groups, separate groups, visible groups) and, optionally, a grouping it's limited to: activity settings, found with `get_activity_settings` and changed with `update_activity`. Separate groups hide other groups' work; visible groups show it.
- A `group` restriction shows an activity or section only to one group.

## Badges

1. Draft with the person what the badge certifies and its criterion; `list_badges` shows the course's badges first.
2. `create_badge`: name, plain-text description and a local PNG, JPEG or GIF image of 256 KB at most; it starts disabled.
3. `set_badge_criteria`: activities completed, the course completed with a minimum grade, or awarded by hand by some roles.
4. `set_badge_enabled`, last: enabling it awards it at once to everyone who already meets it, and they're told; its criteria can't change after that while anyone has it, so check them first.

`award_badge` awards a manual badge to a student, with the person's yes.

## Checking the paths

After setting them up, walk every path with the person: what a locked activity says, which condition opens it, and what a student who has done everything sees. The person tries it in Moodle as a student ("Switch role to... Student"), since moodle-mcp works as them.
