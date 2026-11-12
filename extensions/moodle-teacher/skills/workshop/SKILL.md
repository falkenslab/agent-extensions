---
name: workshop
description: Run a Moodle workshop (peer assessment) with moodle-mcp - its setup and phases, the assessment form, example submissions with their reference assessment, allocating reviewers, and the grading evaluation phase that calculates and overrides grades. Use whenever a workshop is created, configured, allocated, switched to another phase or graded.
---

# Workshop: peer assessment

Create it hidden with `create_activity` (`type: "workshop"`), learn its form's field names from `get_activity_settings` on one like it, and follow the `publishing` skill. `get_workshop` reads its phase and its report: every submission (author, title, grade once calculated) and every assessment (reviewer, author, grade given, weight, grade for assessing), people as aliases while the server pseudonymizes.

## Phases

- Setup, submission, assessment, grading evaluation, closed. The dates ("open for submissions from", "open for assessment from" and their deadlines) are what open and close each phase for students; with them set, switching early with `set_workshop_phase` is harmless, without them it's the only switch.
- Moodle allocates nothing and calculates no grades on its own when the phase changes.
- Changing the phase changes what students can do: `set_workshop_phase` only with the person's yes.

## Two grades

One for the submission (from the assessments it received), one for each student's assessing (how close their assessments are to the others'). Their maximums are workshop settings (`update_activity`), and both go to the gradebook.

## The assessment form

- Its strategy (accumulative, comments, number of errors, rubric) is a workshop setting (`update_activity`). `get_workshop_assessment_form` reads the form; `set_workshop_assessment_form` replaces its aspects, assertions or criteria, in order.
- A rubric's levels take grades from 0 to 100; accumulative takes whole points only, so scale criteria that use halves (×2): the workshop normalizes it.
- Once there are assessments, changing the form is refused unless `evenIfAssessed`, which the server confirms with the person: grades already given stay as they were, with the old form.
- Self-assessment is an option of the allocation, not of the form.

## Example submissions

Where the workshop uses examples (a setting), students practise assessing on them before or alongside their peers' work.

- `list_workshop_examples` lists them, with whether their reference assessment is made and its grade (Moodle lists them in the setup phase).
- `add_workshop_example` (title, HTML text with images in `embed`, attached files) and `edit_workshop_example` (only what's given; attachments replace those there) change the course: confirm the text first.
- `assess_workshop_example` makes the teacher's reference assessment through the form, the one students' practice assessments are compared with: only the assessment the person approved.
- `delete_workshop_example` deletes it with every assessment of it: say so, and the server asks the person itself.

## Allocation

- `allocate_workshop_randomly`: reviews per submission or per reviewer, keeping the current ones or not, with or without self-assessment, excluding peers of the same group if asked.
- `schedule_workshop_allocation` has Moodle allocate when the submissions deadline passes (it never runs without one).
- `allocate_workshop_reviewer` allocates one reviewer to one submission by hand.
- `get_workshop_allocation` shows who reviews what: read it after allocating, and report the problems Moodle lists (not enough reviewers).
- `remove_workshop_reviewer` removes an allocation, deleting its assessment; one already graded only goes with `evenIfAssessed`, which the server confirms with the person, and its grade is lost.
- Allocating gives students work: confirm first.
- **Teams reviewing teams**: "Separate groups" allocates reviewers from the same group, the opposite of peer review between teams. Use "Visible groups" with "Prevent reviews by peers from the same group".

## Assessing as the teacher

`get_workshop_submission` reads a submission; `assess_workshop_submission` assesses it through the form as the person: only the assessment they approved, with feedback without aliases.

## Grading evaluation

In the grading evaluation phase:

1. `calculate_workshop_grades` calculates each submission's grade from its assessments and each assessment's grade for assessing, by the workshop's evaluation method; `comparison` sets how strictly assessments are compared with the best one (the form keeps the last one used). Overridden grades stay. It returns the submissions and assessments with their grades. Students see them once the workshop is closed: say so and ask first. Calculating again later replaces what was calculated.
2. Show the person the grades it returned, as a table.
3. `override_workshop_grade` overrides one grade (a submission's or an assessment's grade for assessing, by its id from `get_workshop`), with feedback for the author or reviewer; `remove: true` takes the override away. Students see it: only with the person's yes for each.
4. Closing the workshop (`set_workshop_phase` to `closed`) publishes the grades to students: only when the person says.
