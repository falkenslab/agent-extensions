---
name: copy-and-restore
description: Reuse Moodle course content with moodle-mcp - copy a course, import activities from another course, back up to a .mbz and restore it, read or anonymize a .mbz on this computer, and check the result. Use when the person asks to reuse last year's course, copy activities, back up or restore a course, look inside or share a backup file, or prepare a course for a new term.
---

# Copying, backing up and restoring

Pick the lightest tool that does the job, and never bring other people's data along unless the person asks.

## Which tool

- **Some activities into another course of the same site**: `import_activities` (`fromCourseId`, `toCourseId`, `activityIds`). The lightest.
- **A whole course into a new one, same site**: `copy_course` (a new name, short name and category; without users).
- **A file to keep or move**: `backup_course` to a local folder (`withUsers` false unless asked), then `restore_course` into a new course, or an existing one (`mode`: `merge`, the default, adds to it; `replace` replaces its content).
- **A backup file on this computer, before restoring or sharing it**: `read_backup` (`file`, an absolute path) tells what it holds without Moodle (see below); `anonymize_backup` writes a copy that names no one and no site.
- **Between two Moodle sites**: see the `several-sites` skill (`copy_between_sites`).

## Steps

1. **Confirm the source and the target** with the person: course names and ids (`list_courses`, `get_course_structure`), what goes (all, some sections, some activities) and whether the target is new or existing.
2. **Say what will be written** before the write: a new course, or added to which section, or replacing what. Restoring with `mode: "replace"` deletes what the target had: ask twice.
3. **Do it**, then **check** (below).

## A backup file on this computer

Both tools work on the file alone: no Moodle is opened, and no site needs to be active.

- **Before restoring a .mbz** someone gave the person, or one from another site: `read_backup` first. Tell them the Moodle version that made it and the plugins it needs (a site without them skips those activities), and what a restore here leaves broken (restrictions on activities the backup doesn't hold, links to them, its grade category), so they decide before `restore_course`.
- **Before sharing a unit** with other teachers: `read_backup` says whether it holds people's data and what still names a person, the site or the course. Then `anonymize_backup` (`file`, `destFile`) writes a copy without them, which Moodle restores as a backup from another site; the content (texts, settings, files) stays as it was. It refuses a backup with people's data: make a new one with `backup_course` and `withUsers` false. Ask before writing over the original (`destFile` equal to `file`), and say what it cleared.
- Under pseudonymize, names and user ids in what they report come as `[name]` and `[user]`: there's no site to look them up in, so don't promise the person who they are.

## After a copy or a restore

- `get_course_structure` on the target: every section and activity there, in order, visible as intended.
- Dates: activities keep their old open, due and close dates. List them (`get_activity_settings`) and ask what the new ones are; `update_activity` changes them.
- Groups and groupings don't come without users: activities limited to a group need it again (`create_group`, `list_groupings`).
- Gradebook: `get_gradebook_setup` on the target, compared with the source's.
- Links between activities and to files: open one or two with `get_activity_content`.
