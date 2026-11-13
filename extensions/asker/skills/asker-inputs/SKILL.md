---
name: asker-inputs
description: Write, refine or fix an Asker definitions file (.haml or .xml) with the asker server - concepts with names, tags and definitions, tables, sequences, templates, files, problems and code - drafted only from the person's notes, reviewed by them, refined the way Asker's author does, and checked with check_input until Asker reads it. Use when the person wants questions made with Asker from their notes, has an Asker input to write, extend or fix, or asks how to write one well.
---

# Asker definitions files

Asker makes many quiz questions from a definitions file, the same way every time: the file is the source, and its questions are only as right as it is. Its author's words: you only work on the input file, on the content, not on the questions. So the person's notes, materials and words are what goes in; never add facts, definitions or examples of your own, and when the notes leave a gap, ask instead of filling it. What to teach and how to assess it is the person's, or their agent's; this skill is how Asker reads a file.

## Before writing

- **`check_requirements`** first if Asker hasn't run in this session: it needs Ruby and the asker-tool gem. When one is missing, give the person the install command it returns and wait; never install anything yourself. If they've just installed them, the app may need restarting. `asker-troubleshooting` covers what goes wrong.
- **`asker_input_reference`** gives the language with an example per element (`topics` for only some, `questions` for what Asker makes from each). Read it before writing, and the topic you need before tables, templates, files, problems or code.

## Where the file goes

- A `.haml` file (or `.xml`) in a folder for one subject, where the person keeps their materials. Asker reads every `.haml` and `.xml` in that folder and takes wrong answers from the other concepts there: related files together, unrelated ones apart.
- Nothing else ending in `.xml` or `.haml` in that folder: a Moodle XML there (one generated earlier, say) stops Asker. Generated questions go to a subfolder (`questions/`).
- A file name without spaces or accents (`networks-devices.haml`) is safest; the extension must be `.haml` or `.xml`, not `.html` or `.txt`.
- Ask where if they haven't said; never write over a file without their yes.

## Writing it, part by part

- **`%map`**: `lang` (required: en, es, fr, ca or du) is the language of Asker's own words in the questions, so match the person's; `context` says what the file is about; `version: '1'`.
- **`%concept`**: one thing to learn, with an identity of its own in the subject.
  - `%names`: only the names it really goes by (synonyms, singular and plural, its name in another language when the subject uses it), never a description. The first names its questions. Two different things listed as names (a monomial and a polynomial, say) are two concepts: split them.
  - `%tags`: words that characterize it; Asker relates concepts through them.
  - `%def`: text that fits this concept only, unambiguously, never another in the folder; a definition that could fit another is a table row instead. Several definitions give many more questions. Don't put the concept's name in it.
- **`%table`**: facts that may be shared with other concepts (characteristics, types, parts, examples). One field for a list; several fields when each row relates values (each pair of columns gives questions, so a three-column table gives more than a two-column one); `sequence` only when the rows truly go in an order, said in its label. Every `%row` has one `%col` per field.
  - A row with its own definition, its own parts or examples may deserve to be a concept: ask the person.
  - A list item with a note in brackets ("Header (company and worker data)") is usually two columns.
- **`%template`**: rows repeated with each value of a variable, to write less.
- **`%def{ type: 'file'}`**: an image, audio, video or text file that identifies the concept, by a path relative to the file's folder, or a link that ends in the file's own name (`.png`, `.jpg`, `.mp3`…). A share page (Google Drive, OneDrive) isn't the file. An image must show this concept, not a general picture: highlight the part it's about.
- **`%problem`**: for practical subjects (calculations, procedures), a statement (`%desc`) with questions (`%ask`) that have an `%answer` (or a formula) or the `%step`s to it, and `%cases` (four or more) that run it again with other values.
- **`%code`**: a program file (Python, Ruby, JavaScript, SQL); experimental in Asker.
- **Text students see** (names, definitions, tables, files) has the language's accents and spelling; **tags and context** either all with accents or all without, since Asker compares words as written. Plain text for formulas: Moodle may not render `$…$` LaTeX.

## Drafting from notes with the person

1. Read their notes and list the concepts you see, and which ones would be a table rather than a concept; agree the list with them.
2. Write the file from the notes only. Where a definition, a name or a table is missing, ask, or leave the concept out and say so.
3. **Show the draft** and go through it with them: every definition fits only its concept, the names are real names, sequences are really ordered. Their corrections go in.

## Checking and refining

- **`check_input`** with the file's absolute path, after writing it and after every change. It gives:
  - `hints`: what stands out before Asker runs (invisible characters, tabs, odd indentation, an empty `%def`, a file or link that won't load, a `%map` without `lang`), each with its line;
  - `syntax`: Asker's own checker, which is stricter than Asker (it refuses `%tags` and `%def` in a `%code`, which Asker reads);
  - `errors` and `explained`: what Asker says loading it, and in plain words, including errors in the other files of the folder;
  - `wouldGenerate`: the questions per concept, problem or code file, and `withoutQuestions`, those that would make none.
- Fix what it says and check again until `ok` is true. Spaces are the usual cause: HAML counts them (0 before `%map`, 2 before `%concept`, 4 before its keywords, 6 before `%row`, 8 or 10 before `%col`), with no tabs and no invisible characters; retyping the line fixes an invisible one.
- **Refine with the counts**: a concept with few questions needs more definitions or a table, from the person; a concept with none needs a definition or a table, or more concepts to compare with. Say so and ask; never make content up to raise the numbers.
- For a long file, the `input-reviewer` subagent reads it against these rules and the person's notes and returns what to fix, without changing it.

It only reads: the trial run's files are thrown away. Then generate with `asker-questions`.
