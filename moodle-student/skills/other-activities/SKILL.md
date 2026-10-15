---
name: other-activities
description: Do Moodle's other activities as a student with moodle-mcp - choices (polls), surveys and feedback, lessons page by page, SCORM packages, H5P, peer assessment in a workshop, and marking activities as done - knowing which answers are final and checking what Moodle recorded. Use whenever the person answers a choice or survey, goes through a lesson, plays a SCORM or H5P activity, assesses a classmate's work, or marks an activity complete.
---

# Other activities as a student

Read each one before acting (its own `get_*` tool), say what's final, and act only with the person's yes: these answer in their name, and many can't be taken back.

## Choice (poll)

`get_choice`: the question, options with their ids, whether it's open, whether several can be chosen and whether the answer can change. `answer_choice` with `optionIds`. When the choice doesn't allow changing it, say so before answering.

## Survey and feedback

`get_survey` (`type`: `questionnaire` or `feedback`, as `get_course_structure` gives it): whether it can be answered now, every question with whether it's required and its fields. `submit_survey` with `responses` (field name → value: an option's value, `"1"`/`"0"` for checkboxes, text otherwise); Moodle's complaints (a required question left out) come back by page. Usually one response per person. Ask the person for anything personal instead of guessing it.

## Lesson

`get_lesson_page` reads the page the person is on (starting the lesson the first time): a content page with its buttons, a question with its fields, or the end with the score. `answer_lesson_page` presses a button (by label or position) or answers a question's fields. Answers count toward the lesson's grade and can't be taken back: each question page's answer is the person's decision. Reaching the end ends the attempt.

## SCORM and H5P

- **SCORM**: `get_scorm` (attempts allowed and made, grading, each part's status and score), then `open_scorm` opens it in Moodle's player (it starts an attempt) and the `browser_*` tools work inside it. Afterwards `get_scorm` again: only what Moodle recorded counts, never assume it.
- **H5P**: `get_h5p_activity` gives its type and the person's attempts and scores; the content runs in a player, so solving it needs the `browser_*` tools, after saying so.

## Workshop: assessing classmates

In the assessment phase, `assess_workshop_submission` assesses an allocated classmate's work through the workshop's form: a grade and comment per criterion, in the form's order, and overall feedback. The author reads it: confirm the assessment with the person. Feedback has no aliases in it.

## Marking as done

`set_completion` marks an activity with manual completion done (or not done), as its button does. Activities that complete on their own (viewing, submitting, a grade) can't be marked: Moodle says so. Mark only what the person has really done.
