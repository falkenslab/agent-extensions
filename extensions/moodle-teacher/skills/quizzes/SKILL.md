---
name: quizzes
description: Build or change a Moodle quiz with moodle-mcp - its settings for what it's for (dates, time limit, attempts, grading method, question behaviour, review options), questions in a bank (imported as GIFT or Moodle XML, or one by one), fixed or random slots, order, pages, marks and the total - and change one safely once it has attempts. Use whenever a quiz or its questions are created or modified, or a question bank is turned into a test.
---

# Quizzes in Moodle

A quiz is its **settings** (when, how many times, how it's graded, what students see after) and its **slots**, each pointing to a question in a bank. Build the bank first, then the quiz. Both have to agree with what the quiz is for.

## 1. Settings, and what each does

Which values a quiz needs is the person's decision (or the agent's teaching knowledge); this is what each setting does in Moodle.

| Setting | What it does in Moodle |
| --- | --- |
| Open and close | Students can start attempts only between them; an attempt open at the close is submitted or abandoned as "When time expires" says |
| Time limit | Each attempt's clock; none by default |
| Attempts allowed | How many attempts each student gets; unlimited by default |
| Grading method | Which attempt makes the grade with several: highest, average, first or last |
| How questions behave | Deferred feedback: nothing marked until the attempt is submitted. Immediate feedback and interactive with multiple tries: each question checked during the attempt (interactive lets a student retry it for fewer marks) |
| Review options | What students see of an attempt (whether correct, marks, feedback, right answer), separately during it, right after it, later while the quiz is open, and after it closes |
| Grade to pass | The grade that "passing grade" completion and restrictions need |
| Layout | How many questions per page |
| Shuffle within questions | Reorders a multiple choice's options in each attempt, so an option like "all of the above" moves too |

Create it hidden with `create_activity` (`type: "quiz"`); its description is what students read on the quiz's page before they start. Field names for `settings` come from `get_activity_settings` on an existing quiz (dates are groups: `timeopen[day]`...); never guess them. The maximum grade isn't in the quiz's settings form: it's the quiz's grade item in `get_gradebook_setup` (10 by default), and it should be what the gradebook needs (see `gradebook`). A quiz that mustn't count toward the course total gets weight 0 there (`update_grade_item`), with the person's yes.

## 2. Questions in a bank

- **Which bank.** `list_question_banks`: in Moodle 5 each quiz has its own bank, and shared banks are separate "Question bank" activities any quiz in the course can use; in 4.x there is one course bank. `list_questions` lists a bank's categories and questions with their status.
- **Several questions: import them.** `import_questions` with GIFT or Moodle XML, as text or a file, into a category named for the topic, never the default one (`add_question_category` if it doesn't exist). Moodle checks the whole file first: when it can't parse it, nothing is imported and its messages say why.
- **GIFT: `validate_gift` first**, with the same text or file: it splits the questions as Moodle does and reports each problem with its line (a question Moodle can't read, a multiple choice with no right answer, a weight Moodle doesn't take). Fix and check again until it's valid, then import.
- **Other types** (Cloze, ordering, drag and drop, calculated…) in Moodle XML, or `create_question` for the types it takes. `list_question_types` says first which ones this site offers (plugins marked): never plan a quiz on a type it lacks.
- **Reusing a bank**: `export_questions` saves a bank or a category to a GIFT or Moodle XML file, which `import_questions` recreates in another course.
- **Categories**: `list_question_categories` lists a bank's categories with their ids and how many questions each holds; `add_question_category` adds one; `edit_question_category` renames, describes or moves one under another parent, with its subcategories and questions; `move_questions` moves questions into another category, each keeping its id and versions. Each with the person's yes. `delete_question_category` moves its subcategories up to its parent and needs `moveTo` when it holds questions; say what goes, and the server asks the person itself.
- **One or two:** `create_question`, and `update_question` to fix one.
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
- `remove_quiz_slot` takes a slot out of the quiz by its place (from `get_quiz_structure`); the question stays in its bank. With the person's yes, and only before there are attempts.

An **Offline Quiz** (a plugin, printed and answered on paper) takes its questions by group: `get_offline_quiz_groups`, then `add_questions_to_offline_quiz` with bank question ids, at the end or on a page. `create_offline_quiz_forms` makes each group's question, answer and correction forms (PDF by default), and the server confirms it: from then on its questions can't change. Its links are saved with `download_file`.

## 4. Changing a quiz with attempts

Look first: `get_quiz_results`. With no attempts, anything can change. With attempts, Moodle refuses to add or remove questions and to reorder them; marks can change (it regrades). Never change what a question asks or which answer is right after students were graded on it: propose a new question, or a manual regrade the person decides (no moodle-mcp tool regrades: the person does it in Moodle, or the `browser_*` tools with their yes, as `read-a-course` says). Individual extra time or attempts: `set_quiz_override`, with the person's yes.

## 5. Preview

Before it's shown (see `publishing`), check it as students will meet it: questions in order, code keeping its indentation, feedback and review options as intended. `get_quiz_structure` shows the order and marks; for how it looks and behaves, the person previews it in Moodle (the quiz's "Preview", which doesn't count in the results).
