---
name: grading
description: Grade in Moodle with moodle-mcp - assignment submissions with their rubric, marking guide or simple grade, quiz questions graded by hand, whole-forum grades - proposing first and saving only what the person approves, with feedback that's really saved, group submissions, missing work, extensions and the marking workflow. Use when the person asks to grade, mark or give feedback on an assignment, a quiz's essays or a graded forum.
---

# Grading in Moodle

The person grades; you prepare. Nothing is saved without their yes, submission by submission or as a reviewed batch. How to judge the work comes from the person's criteria (or the agent's teaching knowledge); this skill is how it reaches Moodle.

## Assignments

1. **How it's graded.** `get_rubric`: simple (a grade or a scale), a rubric (criteria with levels and points) or a marking guide (criteria with a maximum each). If it has a rubric or guide, grade with it, level by level, not with a bare grade and a separate comment. If it has none and is graded by hand, offer to set one up first (see `assignments`).
2. **Can feedback be saved?** Written feedback is only kept when the assignment has "Feedback comments" on: check in `get_activity_settings`. If it's off and feedback is wanted, turning it on is a settings change (`update_activity`) with its own yes, before grading.
3. **What's to grade.** `get_submissions`, a page at a time (`more` says there are others): status (`submitted`, `draft`, `new`, `reopened`, `none`), whether it needs grading, extensions and dates, and the content (online text, file links; `download_file` to read a file).
4. **Propose.** Per submission: the level per criterion (or the grade), with a reason quoting the work, and feedback to the student as "you". Show the proposals as a table the person can correct.
5. **Save exactly what's approved**, word for word: a change you'd like to make afterwards (a line added to the feedback, a different level) goes back to the person first. `grade_submission` with `user` (the alias), `rubric` (criterion id → level id) or `guide` (criterion id → score) or `grade`, `remarks` per criterion, and `feedback`. Ask whether to `notify`.
6. **Check what was saved.** `grade_submission` returns the grade and the feedback Moodle has now: if the feedback isn't there, it wasn't saved. Never tell the person students got feedback you haven't seen saved.

### Cases

- **The person's scale isn't the activity's** (they grade out of 10, the assignment is out of 100): say so before proposing, and let them choose between converting each grade or changing the maximum grade first (a settings change, and the gradebook's weights move with it: see `gradebook`).
- **Students see grades at once** unless the assignment uses the marking workflow: `notify: false` only skips the notification. Say so before saving.
- **Group submissions**: `applyToGroup: true` gives the whole group the same grade and feedback; grade once, not member by member.
- **No submission after the deadline**: `grade_submission` works without one. Whether it's a 0 or left alone is the person's policy: ask, and don't leave it silently ungraded (it looks like "not reviewed yet").
- **Late work and extensions**: `get_submissions` shows the dates; `grant_extension` gives more time. Penalties are the person's decision: point them out, never apply them on your own.
- **A rubric's levels are fixed points**; a marking guide takes any score up to each criterion's maximum. When a level covers a range in the person's criteria, agree the rule the first time it applies and keep it for every submission.
- **Feedback files** (an annotated PDF): `feedbackFiles`, as an extra to the written feedback, never instead of it.
- **Marking workflow**: with it on, grades stay hidden until released. `workflowState` in `grade_submission`, or `set_workflow_state` for several at once; "released" shows students their grades: only when the person says. `allocate_marker` for several markers.

## Quiz questions graded by hand

`list_questions_to_grade` gives the questions waiting (essays...) and the attempts whose answer needs it. Read an answer with `get_attempt_review`; propose a mark (in the question's points, 0 to its maximum) and a comment; save with `grade_quiz_question`. The attempt's grade updates.

## Whole-forum grades

`get_forum_grades` lists who can be graded and how (points or scale); read their posts (`list_discussions`, `get_discussion`), propose, and save with `grade_forum_user`. Not by counting posts: by what the forum's criteria ask.

## Good practice

- Same evidence, same level: two students with the same mistake lose the same.
- No aliases in feedback, remarks or comments: write "you". moodle-mcp refuses text with an alias.
- When something doesn't fit the rubric, say so instead of forcing a level.
- Close by saying how many are graded, which are left, and whether students were notified.
