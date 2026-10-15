---
name: several-sites
description: Work with several Moodle sites through moodle-mcp as a student - which one is active, adding and switching sites, and keeping courses, ids and aliases apart per site. Use when the person mentions another Moodle (their school's and their university's, a training platform), or asks to add or switch sites.
---

# Several Moodle sites

moodle-mcp knows several sites; one is active, and every tool works on it.

## Which site

- `list_sites` lists them: name, address, which one is active, and where each came from (the extension's settings, or added later).
- When the person means another site, `use_site` with its name, and say which site you're on now. Don't switch without saying it: a course id means another course on another site.
- `add_site` adds one (its address; any page of it works): the person is asked for it in a form when the app can show one. The first time on a site, `login` opens a window where they log in themselves.
- `remove_site` forgets a site added later, with its signed-in session. Sites from the extension's settings are changed there, not here.

## Good practice

- Name the site every time you report something ("on school, the course has…"): two sites can have courses with the same name.
- Aliases belong to a site: the same alias on two sites isn't the same person.
- "What do I have left" across sites means one look per site (`use_site`, then `list_pending` or `list_deadlines`), named by site.
