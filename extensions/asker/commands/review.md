---
description: Review Asker's generated questions with you, and write a copy without the ones you leave out
argument-hint: "<file-moodle.xml>"
---

Review the questions in this Moodle XML file with the person: $ARGUMENTS. Follow the `asker-questions` skill's review.

1. `read_questions` with its absolute path, `limit: 50`: say the totals per concept and type, and the notes.
2. For more than about 50 questions, offer the `question-reviewer` subagent to go through them first and flag what needs a look; otherwise go through them with the person, group by group, as a table (name, question, right answer, options).
3. Collect the names the person rejects (and whole types, when their Moodle lacks ordering or ddmatch).
4. With their yes, `exclude_questions` into a new file next to it (`…-reviewed.xml`), never over the original. Say how many were kept and left out, and the names not found.
5. Offer to import the reviewed file with moodle-teacher's `import_questions`, into the bank and category the person chooses, with their yes.
