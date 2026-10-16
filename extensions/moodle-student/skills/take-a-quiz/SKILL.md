---
name: take-a-quiz
description: Take a Moodle quiz as a student with moodle-mcp - read its rules first (attempts, time limit, grading, dates), start an attempt only with the person's yes, answer each question type in the fields Moodle expects, check every answer, submit for good with their yes, and learn from the review. Use whenever the person attempts, continues, submits or reviews a quiz.
---

# Taking a quiz

How to answer each question is the person's (or comes from wherever the agent's study knowledge does); this skill is how a quiz works in Moodle so nothing is lost. Starting and finishing an attempt are the person's decisions.

## 1. Before starting

`get_quiz_info`: the description, attempts allowed and made, grading method (highest, average, first, last), time limit, open and close dates, the person's attempts with their ids, and whether they can start one now. Tell the person what starting costs:

- **An attempt used up** of those allowed; with one attempt, this is the only one.
- **The clock**: with a time limit, it starts running at once and doesn't stop when the agent pauses. When time expires Moodle submits or closes the attempt as the quiz says.
- An attempt **in progress** continues where it was: starting again doesn't make a new one.

## 2. Answering

1. `start_quiz_attempt` (after the person's yes) returns the attempt id and its questions, with each one's fields and options. `get_quiz_attempt` reads them again, page by page, with the answers saved so far.
2. Read each question whole: context text, images and tables above the options often decide the answer.
3. `answer_quiz_questions` saves answers by slot and field name: an option's **value** for choices and selects (not its label), `"1"` or `"0"` for checkboxes, text for text fields. It doesn't finish the attempt; it returns what was saved: check it.

| Question type | In Moodle |
| --- | --- |
| Multiple choice, one answer | One radio option per question |
| Multiple choice, several answers | A checkbox per option; wrong ticks usually take marks away, as much as a missing one |
| True/false | Two radio options |
| Short answer, numerical | A text field; the format the question asks (units, decimals) and, unless it says so, case doesn't matter |
| Matching | A select per item |
| Essay | A text area, graded by hand later: its mark comes after the teacher grades it |

## 3. Submitting

1. **Check every answer** with `get_quiz_attempt`: no question left blank unless it's optional, each answer the intended one.
2. **Ask the person**: after `finish_quiz_attempt` no answer can change.
3. `finish_quiz_attempt` returns the review when the quiz shows it.

## 4. The review

`get_attempt_review` gives what the quiz lets students see after an attempt: the mark per question, whether it was right, feedback and the right answer. Some quizzes show these only after they close: say so instead of guessing. With attempts left, the review is what to study before the next one.

## Good practice

- Never start an attempt just to look at the questions: it counts.
- A quiz that's closed, out of attempts or locked by a restriction can't be taken: say why (from `get_quiz_info`), never look for a way around it.
