---
name: gradebook
description: Set up and check a Moodle course's gradebook with moodle-mcp so the final grade is computed as the person's grading scheme says - categories, aggregation, weights, each activity's maximum grade, manual grade items, overrides, scales and grade letters, and the grader report - decided before the first graded activity rather than repaired after the last. Use when a course's weights or grading scheme are set up, changed or checked, when graded activities are created, or when grades are exported or imported from a spreadsheet.
---

# The gradebook

The person's grading scheme (a 10 % quiz, a 40 % project, units by weight) is only real once the gradebook computes it. Decide how before creating graded activities: repairing weights after the last activity means touching every one.

## Reading it

- `get_gradebook_setup`: categories (aggregation, weight, maximum) and grade items (category, maximum, weight), without anyone's grades.
- `get_grader_report`: everyone's grades, per item, category and the course total (one group with `group`).
- An activity's maximum grade is set in the activity (`update_activity`, the grade field from `get_activity_settings`), not in the gradebook.

## How weights come out

- **Natural** (Moodle's default): a category's total is the sum of its items' points, so an item's weight is its maximum grade over the total. With only Natural, a 10 % quiz and a 40 % project out of 100 are a quiz out of 10 and a project out of 40, set when each is created. Weights can also be overridden per item (`update_grade_item` with `weight`, a percent).
- **Weighted mean of grades**: each item or category gets an explicit weight, whatever its maximum; items can keep a common maximum (10, 100).
- **Categories** per unit or per kind of work (`add_grade_category`, `update_grade_category` for aggregation and weight in its parent; `update_grade_item` to move an item into one) keep a scheme readable when it has more than a few items.
- Some sites offer only some aggregations: if Moodle refuses one, say so and propose the scheme with what it offers (Natural can do any weighting with maximums or overridden weights).

## Setting it up

1. Read the scheme with the person: what counts, how much, and on what scale the final grade is (10, 100).
2. Propose the structure (categories, aggregation, each item's maximum or weight) as one list, and wait for a yes: it changes how every grade is computed.
3. Build it: categories first, then each graded activity created with its maximum and put in its category, manual items (`add_grade_item`) for what's graded outside Moodle (an oral exam).
4. Check (below).

## Checking it

- Weights add up as the scheme says, per category and in the course total; no graded activity outside its category; no item with a zero maximum.
- The course total's scale is the one the person reports grades on.
- With a few grades in, `get_grader_report`: does a student's total match the scheme worked by hand? Compare one or two.

## Changing grades in the gradebook

- `set_grade` sets a manual item's grade, or **overrides** an activity's or a category's; an overridden grade no longer follows the activity until `override: false`. Prefer grading in the activity (see `grading`).
- `excluded` leaves a grade out of the totals (an excused absence), when the person says.
- `export_grades` saves a spreadsheet, CSV or XML; it names every participant, so it only works with names in clear.
- `import_grades` brings grades from a local CSV, as Moodle's CSV import does: `mapFrom` is the column that identifies each person and `mapTo` what it holds (user id, username, ID number or email), `items` which grade item (from `get_gradebook_setup`) each other column goes into, `feedback` which item's feedback. Always `preview: true` first and show the person how Moodle reads the file; then import on their yes, since students see the grades. Moodle imports all or nothing. The file identifies people, so it only works with names in clear; otherwise grades go one by one with `set_grade`.

## Scales and grade letters

- `list_scales`: the course's scales and the site's standard ones, with their values and whether something grades with them. `add_scale` adds one (values from the lowest to the highest, no commas in them); `edit_scale` changes its name, values or description, but a scale something grades with keeps its values. Both with the person's yes.
- `get_grade_letters`: the course's letters from the highest boundary down (its own, or the site's). `set_grade_letters` sets the course's own, each from its minimum percent; `useDefaults` goes back to the site's. It changes how grades show to students: with the person's yes.

## Deleting

- `delete_grade_category` moves what the category held into its parent and deletes its total's grades; the course's own category can't go.
- `delete_grade_item` deletes a manual item with every grade in it; an activity's item goes only with its activity.
- Neither can be undone: say what goes before calling it, and the server asks the person itself.
