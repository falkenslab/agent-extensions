---
description: Check an Asker definitions file and say what to fix, line by line (only reads)
argument-hint: "<file.haml or file.xml>"
---

Check the Asker definitions file the person gives: $ARGUMENTS

Call `check_input` with its absolute path (ask for it if none was given). It only reads. Then tell the person, in this order:

1. Whether Asker reads it (`ok`), and how many questions it would make, per concept, problem or code file.
2. What stops it: the `errors`, with `explained` in plain words, and the `hints` with their lines; a file in the folder that isn't an Asker input, if that's what's wrong.
3. What could be better: `withoutQuestions`, and Asker's checker complaints (`syntax`) when Asker reads the file anyway.

Offer to fix the form (spaces, keywords, invisible characters) and check again; for content (a missing definition, a table), ask the person for it. See the `asker-troubleshooting` skill for each message.
