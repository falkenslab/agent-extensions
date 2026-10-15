---
name: quizzes
description: Build or change a Moodle quiz with moodle-mcp - its settings for what it's for (dates, time limit, attempts, grading method, question behaviour, review options), questions in a bank (imported as GIFT or Moodle XML, or one by one), fixed or random slots, order, pages, marks and the total - and change one safely once it has attempts. Use whenever a quiz or its questions are created or modified, or a question bank is turned into a test.
---

# Quizzes in Moodle

A quiz is its **settings** (when, how many times, how it's graded, what students see after) and its **slots**, each pointing to a question in a bank. Build the bank first, then the quiz. Both have to agree with what the quiz is for.

## 1. Settings for its purpose

| Setting | Formative check | Graded test |
| --- | --- | --- |
| Open and close | The unit's dates | A fixed window |
| Time limit | Usually none | Realistic for the number of questions |
| Attempts allowed | Several or unlimited | 1, or 2 with the highest counting |
| Grading method | Highest grade | Highest grade or first attempt |
| How questions behave | Immediate feedback, or interactive with multiple tries | Deferred feedback |
| Review options | Feedback and right answers after each attempt | Right answers only after the quiz closes, if at all |
| Grade to pass | If completion depends on it | If the course requires one |

Layout: one question per page for long ones, all on one page for short checks. Shuffle within questions for multiple choice, unless an option like "all of the above" depends on its place.

Create it hidden with `create_activity` (`type: "quiz"`); the description says what it covers, how long it takes, how many attempts and how it counts. Field names for `settings` come from `get_activity_settings` on an existing quiz (dates are groups: `timeopen[day]`...); never guess them. The maximum grade isn't in the quiz's settings form: it's the quiz's grade item in `get_gradebook_setup` (10 by default), and it should be what the gradebook needs (see `gradebook`). A quiz that mustn't count toward the course total gets weight 0 there (`update_grade_item`), with the person's yes.

## 2. Questions in a bank

- **Which bank.** `list_question_banks`: in Moodle 5 each quiz has its own bank, and shared banks are separate "Question bank" activities any quiz in the course can use; in 4.x there is one course bank. `list_questions` lists a bank's categories and questions with their status.
- **Several questions: import them.** `import_questions` with GIFT or Moodle XML, as text or a file, into a category named for the topic, never the default one. Moodle checks the whole file first: when it can't parse it, nothing is imported and its messages say why.
- **One or two:** `create_question` (multichoice, truefalse, shortanswer, numerical, essay).
- **Approve the questions on their own**, apart from creating the quiz: list each one (stem, type, right answer, distractors briefly). "6 GIFT questions about X" isn't reviewable.
- **Ready, not draft.** A quiz can't use a draft question: `set_question_status` to `ready` once the person has seen them.
- Names carrying their place (`U1-01 Container vs VM`, `U1-02 ...`) keep the order visible in the bank and the quiz.

### GIFT that imports well

- A blank line ends a question: one between questions, none inside one.
- Escape `~ = # { } :` with a backslash where they're literal, in text and answers (`n \= 3`, `C\#`).
- Exactly one right answer in a multiple choice (`=`), `{TRUE}` or `{FALSE}` in a true/false, `{#7:0}` for a numerical answer with its tolerance; feedback per option after `#`.
- Moodle trims every line, so indented code loses its indentation: start the text with `[html]` (at the very beginning; in the middle students see "[html]"), put the code in `<pre>`, and write each indentation space as `&nbsp;`.

```
::U1-01 Capital::What is the capital of France? {
=Paris
~London#London is the capital of the United Kingdom
~Berlin#Berlin is the capital of Germany
}

::U1-02 Trace::[html]<p>What does this print?</p><pre>for i in range(2)\:
&nbsp;&nbsp;&nbsp;&nbsp;print(i)</pre> {
=0 and 1
~1 and 2
}
```

After importing, read the result: every question created, none missing. If one came out wrong, fix it with `update_question` (it makes a new version). Never delete questions to import them again.

## 3. Slots, order and total

- `add_questions_to_quiz` with `questionIds` for fixed questions, or `random` (a category and a count) so each attempt draws different ones; random needs enough ready questions in its category: say how many there are.
- Adding several at once may not keep their order: check `get_quiz_structure` and fix it with `edit_quiz_slot` (`moveAfter`), unless shuffling is intended.
- Pages: `set_quiz_pages`; headed parts: `add_quiz_section` (optionally shuffled). Marks per slot: `edit_quiz_slot` (`maxMark`). The total of marks comes from the slots; the quiz's maximum grade scales it: check both are what the person expects, and not zero.

## 4. Changing a quiz with attempts

Look first: `get_quiz_results`. With no attempts, anything can change. With attempts, Moodle refuses to add or remove questions and to reorder them; marks can change (it regrades). Never change what a question asks or which answer is right after students were graded on it: propose a new question, or a manual regrade the person decides. Individual extra time or attempts: `set_quiz_override`.

## 5. Preview

Before it's shown (see `publishing`), check it as students will meet it: questions in order, code keeping its indentation, feedback and review options as intended. When the server offers the attempt tools (role `all`), `start_quiz_attempt` as the teacher opens a preview that doesn't count in the results: read it with `get_quiz_attempt`, then `finish_quiz_attempt`, so no preview is left open. Otherwise the person previews it in Moodle.
