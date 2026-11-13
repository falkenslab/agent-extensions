---
description: Write a new Asker definitions file from your notes, check it, and show it to you
argument-hint: "[notes file or topic]"
---

Write a new Asker definitions file with the person, following the `asker-inputs` skill. What they gave: $ARGUMENTS

1. If Asker hasn't run in this session, call `check_requirements`; if something's missing, give the install commands and stop.
2. Get the content: the notes, a document or the text the person points to. Without notes, ask for them: the file is written only from the person's material, never from your own knowledge.
3. Agree with the person: the folder (one per subject, with nothing else ending in .xml in it), the file name (no spaces or accents, `.haml`), the `lang` of the questions, and the list of concepts (and which facts are tables, sequences or problems instead).
4. Read `asker_input_reference` (`basics`, and the topics you'll use), write the file, and run `check_input` on it until `ok`, fixing only form (spaces, keywords), never content without asking.
5. Show the person the file and `check_input`'s counts per concept; ask them to check every definition fits only its concept. Their corrections go in, and `check_input` runs again.

When the file is ready, offer to generate the questions (`/asker:generate`).
