---
name: copy-and-restore
description: Reuse Moodle course content with moodle-mcp - copy a course, import activities from another course, back up to a .mbz and restore it, and check the result. Use when the person asks to reuse last year's course, copy activities, back up or restore a course, or prepare a course for a new term.
---

# Copying, backing up and restoring

Pick the lightest tool that does the job, and never bring other people's data along unless the person asks.

## Which tool

- **Some activities into another course of the same site**: `import_activities` (`fromCourseId`, `toCourseId`, `activityIds`). The lightest.
- **A whole course into a new one, same site**: `copy_course` (a new name, short name and category; without users).
- **A file to keep or move**: `backup_course` to a local folder (`withUsers` false unless asked), then `restore_course` into a new course, or an existing one (`mode`: `merge`, the default, adds to it; `replace` replaces its content).
- **Between two Moodle sites**: see the `several-sites` skill (`copy_between_sites`).

## Steps

1. **Confirm the source and the target** with the person: course names and ids (`list_courses`, `get_course_structure`), what goes (all, some sections, some activities) and whether the target is new or existing.
2. **Say what will be written** before the write: a new course, or added to which section, or replacing what. Restoring with `mode: "replace"` deletes what the target had: ask twice.
3. **Do it**, then **check** (below).

## After a copy or a restore

- `get_course_structure` on the target: every section and activity there, in order, visible as intended.
- Dates: activities keep their old open, due and close dates. List them (`get_activity_settings`) and ask what the new ones are; `update_activity` changes them.
- Groups and groupings don't come without users: activities limited to a group need it again (`create_group`, `list_groupings`).
- Gradebook: `get_gradebook_setup` on the target, compared with the source's.
- Links between activities and to files: open one or two with `get_activity_content`.
