---
description: Generate questions from an Asker definitions file, then review them with you
argument-hint: "<file.haml, file.xml or folder>"
---

Generate quiz questions with Asker from: $ARGUMENTS. Follow the `asker-questions` skill.

1. Run `check_input` on each input; if one isn't `ok`, say why and stop (see `/asker:check`).
2. Agree with the person, in one short question: the output folder (by default a `questions` subfolder next to the input, never the input's own folder), the formats (Moodle XML unless they ask for GIFT too), the question types or templates to leave out (misspelled-word questions, say), the question bank category, and whether wrong answers take points off.
3. Call `generate_questions` with that. Say the files written, the counts per concept and by type, and every note.
4. Offer to review them now (`/asker:review`): no question should reach a course before the person has seen it.
