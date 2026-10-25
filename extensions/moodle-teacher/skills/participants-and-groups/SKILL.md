---
name: participants-and-groups
description: Manage who is in a Moodle course and how they're grouped, with moodle-mcp - enrolment methods (manual, self enrolment with a key, guest access), enrolling and unenrolling people, their roles, groups and groupings, creating groups automatically or from a CSV, and what each change does in Moodle. Use when the person asks to enrol or remove someone, give a role, open the course with a key, or make, fill or change groups.
---

# Participants and groups

These tools change who is in a course: an agent may leave them all out on purpose (miyagi leaves enrolment and groups to the teacher), and then they aren't there. Say so, and say the person does it in Moodle; never look for a way around it, such as the browser.

People come as aliases when moodle-mcp pseudonymizes (the default): pass them back as they came (`users`, `user`, `add`, `remove`), never ask for or guess real names or emails. With names shown, the tools take user ids instead (`userIds`, `userId`, `addIds`, `removeIds`). Role ids come from `list_participants`' roles; never assume `5` is students on every site.

## Who is in the course

- **`list_participants`**: everyone with their roles and groups, filtered by role, group or those inactive since a date; a page at a time (`limit`, `offset`, `more`).
- **`list_enrolment_methods`**: how people get in, in the order Moodle tries them: manual, self enrolment, guest access, cohort sync…, each on or off, the role it gives and whether it asks for a key (never the key itself).

## Letting people in

- **One by one, by hand**: `list_potential_users` (a part of a name, an ID number) finds who can be enrolled; `enrol_users` enrols them by manual enrolment, with the method's role unless `roleId`, from now unless `start`, until the method's default unless `end`. Someone already enrolled keeps their enrolment with the new dates.
- **The course open with a key**: `set_enrolment_method` with `methodType: "self"` (added if the course has none), `enabled`, a `key`, optional dates (`start`, `end`), `maxUsers` and a welcome message. It opens or closes the course to everyone who has the key or the link: say so before calling it. A group's `enrolmentKey` (in `create_group` or `update_group`) puts whoever uses it straight into that group, within self enrolment.
- **Guest access** (`methodType: "guest"`): look without being enrolled, and do nothing that's tracked or graded. Its key is optional.
- Turning a method off (`enabled: false`) stops new enrolments through it; who's already in stays.

## Roles

`set_user_roles` makes someone's roles in the course exactly `roleIds`, among the ones the person may assign: a non-editing teacher can grade and see, but not change the course; an editing teacher can do everything a teacher can. Roles from elsewhere (the category, the site) stay.

## Letting people go

`unenrol_user` removes every enrolment of theirs the person may remove, with their roles and their groups in the course. Their work (submissions, posts, grades) stays in Moodle, but they can't reach it any more. moodle-mcp asks the person itself before it runs: say who goes and what they lose, and let that question be the yes. To take them out of one group only, use `set_group_members`.

## Groups

- **What there is**: `list_groups` (with members) and `list_groupings` (sets of groups an activity can be limited to).
- **One group**: `create_group` (a name, optionally a description and an enrolment key), then `set_group_members` with who goes in and who comes out: only the course's participants can be added.
- **Many at once**: `auto_create_groups` splits a role, a cohort, a group or a grouping into `count` groups, or groups of `count` members, named by `naming` (`#` becomes their number, `@` a letter: "Group @"), at random, by name or by ID number, or left empty; `notInGroup` takes only those in no group yet, `noSmallGroups` spreads a too-small last group. **Always `preview: true` first**: show the person the groups and members Moodle would make, and on their yes create them by giving that preview's `seed` back, so the groups are the ones they saw.
- **From a list**: `import_groups` reads a local CSV with a `groupname` column (and optionally `description`, `enrolmentkey`, `groupidnumber`, `groupingname`): Moodle creates the groups **without members**, so fill them afterwards; it skips rows it can't take and says why.
- **Changing and removing**: `update_group` renames or changes a group (what isn't given stays). `delete_group` keeps its members in the course, but activities working by groups lose it; `delete_grouping` keeps its groups. moodle-mcp asks the person itself before deleting.
- **Groupings**: `create_grouping`, then `set_grouping_groups` with exactly the groups it should have.

## What groups do in Moodle

Groups don't change anything by themselves: an activity uses them through its group mode (no groups, separate groups, visible groups) and, optionally, a grouping it's limited to, and access restrictions can show an activity only to one group. Those are settings of the activity or of the course: learn their field names with `get_activity_settings` on one like it, and change them with `update_activity` or `update_course` (see `other-activities` and `publishing`).
