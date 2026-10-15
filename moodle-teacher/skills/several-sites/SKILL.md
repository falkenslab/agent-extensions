---
name: several-sites
description: Work with several Moodle sites through moodle-mcp - which one is active, adding and switching sites, and copying course content from one site to another with copy_between_sites. Use when the person mentions another Moodle (their school's and their university's, last year's site), asks to add a site, or to bring content from one site to another.
---

# Several Moodle sites

moodle-mcp knows several sites; one is active, and every tool works on it.

## Which site

- `list_sites` lists them: name, address, which one is active, and where each came from (the extension's settings, or added later).
- When the person means another site, `use_site` with its name, and say which site you're on now. Don't switch without saying it: a course id means another course on another site.
- `add_site` adds one (its address; any page of it works): the person is asked for it in a form when the app can show one. The first time on a site, `login` opens a window where they log in themselves.
- `remove_site` forgets a site added later, with its signed-in session. Sites from the extension's settings are changed there, not here.

## Copying between sites

`copy_between_sites` copies a course's content from one site to another (some activities, some sections or all of it) through Moodle's backup and restore, without other people's data, and without the content passing through you.

1. **Find the source** on its site: `use_site`, `list_courses`, `get_course_structure` for the ids of the sections or activities.
2. **Find the target** on the other: the course (or a category for a new one) and the section where it goes.
3. **Confirm** with the person: from which site and course, what, to which site, course and section.
4. **Copy**, then **check on the target site** as after any restore (the `copy-and-restore` skill): structure, dates, groups, gradebook.

## Good practice

- Name the site every time you report something ("on school, the course has…"): two sites can have courses with the same name.
- Aliases belong to a site: the same alias on two sites isn't the same person.
