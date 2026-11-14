---
name: asker-questions
description: Generate quiz questions from a checked Asker definitions file with the asker server - Moodle XML or GIFT, which question types and templates, the question bank category, penalties - then review every question with the person, write a copy without the ones they leave out, and hand it to moodle-teacher's import_questions. Use when the person asks to generate questions with Asker, to review or filter Asker's questions, or to get them into a Moodle question bank.
label: es=Preguntas con Asker | en=Questions with Asker | fr=Questions avec Asker | de=Fragen mit Asker
icon: ❓
group: create
---

# Generating and reviewing Asker's questions

Asker writes the questions; the person decides which reach a course. No question is imported that the person hasn't seen in a list or read through. The input must pass `check_input` first (see `asker-inputs`).

## Generating

Without a definitions file yet, start with `asker-inputs`. With one, agree the options with the person in one short question (the folder, the formats, the types or templates to leave out, the category, whether wrong answers take points off), then generate.

**`generate_questions`** writes files on this computer: say where first. Use a subfolder of the definitions' folder (`…/questions`), never the definitions' folder itself: Asker reads every `.xml` next to an input, and a Moodle XML there would stop its next run (the server refuses it). It never writes over files unless `overwrite: true`, which only goes with the person's yes.

- `inputs`: one or more files, or a folder (each of its inputs is generated apart).
- `formats`: `moodle` (Moodle XML, the default) is the complete one: prefer it for importing. `gift` on request: GIFT can't carry embedded files or drag-and-drop matching, and the result says which questions it left out. `doc` adds Asker's review sheet, a `.txt` with the definitions as tables.
- `stages`: only some question types for concepts (`definitions`, `table-matching`, `one-field-tables`, `files`, `sequences`, `table-rows`); all by default. Problems and code always give theirs.
- `exclude`: texts in question names to leave out at the source, as Asker does. Its templates are in the names (`asker_input_reference`'s `questions` topic lists them): `"misspelled"` drops the misspelled-word questions, `"d3hidden"` the hidden-letters ones, `"t9table"` one template. Offer it when the person doesn't want a whole kind.
- `category`: the question bank category, as a path ("Unit 3/Networks"), written into the file (see importing below).
- `penalties: false` when wrong multiple-choice answers mustn't take points off (Asker's default does).
- `ddmatch: true` only for a Moodle with the drag-and-drop matching plugin; otherwise those questions are left out, and the result says so.

Asker picks questions at random: each run differs. Review the file that will be imported, and don't generate again after the review, or the review is lost. The result gives each file's path, the counts per concept, problem or code file, by kind and by Moodle type, Asker's errors and warnings, and notes: pass the notes on.

## Reviewing

1. **`read_questions`** on the Moodle XML, a page at a time (`limit` up to 50; `next` is the following page's `offset`), or one `group`, `kind`, `type` or `template` at a time. Each question comes with its name, its template, its text and its answers with the right one.
2. **Show them to the person** as a table they can go through: name, the question, the right answer and the options. For many questions, go group by group or template by template, and point out what usually needs a look:
   - a misspelled-word question whose "misspelling" is a valid spelling, or a misspelled option that's still right;
   - two options that are both right, or a definition that gives its answer away;
   - a question where a random image of the concept sits in the text as a distractor (Asker does this on purpose, but say it);
   - a file or a link that won't show offline or in Moodle;
   - a whole template that doesn't suit the class (offer `exclude` next time).
   For a large file, the `question-reviewer` subagent goes through it and returns the questions it would flag, with the reason; the person decides.
3. **Leave out what they reject**: **`exclude_questions`** with the file, the `names` (exactly as `read_questions` gives them) and/or whole `types`, and a new `outputPath` (`…-reviewed.xml`); the original stays. It returns how many were kept, which went, and the names it didn't find. Read the copy's counts back to the person.

Never edit a question's text yourself: when one is wrong because a definition is, fix the definitions file with the person, check it, and generate again (then review again).

## Importing into Moodle

With the moodle-teacher extension, importing is its `import_questions` (see its `quizzes` skill): `format: "xml"` and `file` with the reviewed Moodle XML's path (or `"gift"` for GIFT), into the bank the person chooses, with their yes. For the category, either generate with `category` and import without `categoryId` (Moodle makes the category from the file), or leave `category` out and pass the `categoryId` of a category in the bank (the file's one is then ignored). Then say how many were imported, from `import_questions`' result.

Without moodle-teacher, give the person the file's path and the steps: in the course's question bank, Import, choose Moodle XML (or GIFT), upload the file.

## Types a Moodle may not have

`ordering` is standard from Moodle 4.4 and a plugin before; `ddmatch` (drag-and-drop matching) is a plugin. When `read_questions` or `generate_questions` notes them, ask which Moodle the questions are for, and leave them out by type with `exclude_questions` if it doesn't have them.
