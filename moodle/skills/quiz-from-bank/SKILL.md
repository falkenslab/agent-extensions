---
name: quiz-from-bank
description: Build or extend a Moodle quiz from a course's question bank with moodle-mcp - find or import the questions, mark them ready, add them (fixed or random) and lay out pages and sections. Use when the person asks to make a quiz, add questions to one, or turn a question bank into a test.
---

# A quiz from the question bank

A quiz holds slots; each slot points to a question in a bank. Build the bank first, then the quiz.

## Steps

1. **Find the quiz and the bank.** `get_course_structure` gives the quiz's id (or create it with `create_activity`, type `quiz`, after confirming its name and section with the person). `list_question_banks` gives the course's banks; `list_questions` lists a bank's categories and questions, with their status.
2. **Bring the questions in, if they aren't there.** Prefer `import_questions` (GIFT or Moodle XML, as text or a file) for many at once; `create_question` for one or two. Put them in a category named for the topic, never in the bank's default one.
3. **Make them ready.** A question in `draft` can't be used by a quiz: `set_question_status` to `ready`, after the person has seen them.
4. **Add them to the quiz.** `add_questions_to_quiz` with `questionIds` for fixed questions, or `random` (`categoryId` and `count`) so each attempt draws different ones. Random questions need enough ready questions in their category: say how many there are.
5. **Lay it out.** `set_quiz_pages` (how many per page), `add_quiz_section` for headed parts, `edit_quiz_slot` for marks and order. Check with `get_quiz_structure`.
6. **Check the rules.** `get_activity_settings` shows open and close dates, attempts, time limit and review options: read them back to the person; change them with `update_activity` only when asked.

## Good practice

- Tell the person what you're about to change in the quiz before each write, as one list, and wait for a yes.
- A quiz that already has attempts can't change its questions freely: check `get_quiz_results` first, and say so.
- Keep the marks consistent: the quiz's total comes from its slots' maximum marks.
