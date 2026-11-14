---
name: asker-troubleshooting
description: Diagnose and fix what goes wrong with Asker through the asker server - Ruby or the asker-tool gem missing or not found, a definitions file Asker won't read (spaces, tabs, invisible characters, a byte-order mark, an empty %def, a %map without lang, XML that isn't well formed), another file in the folder stopping it, images or links that don't show, questions missing from GIFT, and Moodle refusing a question type. Use when check_input or generate_questions fails, when the questions or images don't look right, or when Asker won't start.
---

# When Asker goes wrong

Start from what the server says, never from a guess: `check_requirements` and `server_info` for Asker itself, `check_input` for a file (its `hints`, `syntax`, `errors` and `explained`), and the `notes` of `generate_questions`. Fix the definitions file with the person; never install anything, and never edit a generated question.

## Asker doesn't start

- **Ruby or Asker missing**: `check_requirements` gives the install command for this system; the person runs it. Then the app that runs the server may need restarting, since it keeps the PATH it started with.
- **`gem install` ended with an error** about `rdoc` or `rbs`: that's the gem's documentation failing to build, after `asker-tool` was installed. `gem install asker-tool --no-document` avoids it; `check_requirements` shows whether Asker is there.
- **Asker found but too old**: `gem update asker-tool`. The server needs 2.10 or later.

## Asker won't read a file

`check_input`'s `hints` point at the line; `explained` says what Asker meant.

- **"Write N spaces before %…", "Inconsistent indentation", "Illegal nesting"**: HAML counts spaces (0 before `%map`, 2 before `%concept`, 4 before its keywords, 6 before `%row`, 8 or 10 before `%col`). A tab, a non-breaking space or a zero-width space pasted from a document looks right and isn't: retype the line's start, or delete the character the hint names.
- **"Remove spaces before %map" on line 1**: a byte-order mark (BOM) at the start of the file. Save it as UTF-8 without BOM.
- **A `%def` with no text**, or a space between `%def` and `{`: Asker's checker reports it as an indentation error; the hint says what it really is.
- **"Unknown Lang"**: the `%map` has no `lang`, or one Asker doesn't know (en, es, fr, ca, du). With an empty code, it may be another file in the folder that isn't an Asker input at all.
- **"columns size != table.fields.size"**: a `%row` with more or fewer `%col` than the table's fields.
- **XML that isn't well formed**: the hint gives the line; a closing tag that doesn't match is the usual cause.
- **An empty file**, or one without `%map` on its first line: Asker can't start reading it.
- **asker check complains but Asker reads the file**: Asker skips lines that mean nothing where they are (`%tags` and `%def` in a `%code`, for one) and generates anyway, while its checker flags them. Fix or remove them: they have no effect as they are.

## Another file in the folder

Asker reads every `.haml` and `.xml` in the input's folder (their concepts give it wrong answers). So:

- **A file there that isn't an Asker input** (a Moodle XML generated there earlier, an XML of something else) stops it: `check_input` names it before running. Move it out; generated questions go to a subfolder.
- **A broken Asker input next to a good one** stops the good one too: the error says "In <file>, another file in the input's folder". Fix that file, or move it out.

## Images, audio and links

- **A link that isn't an image**: a `%def{ type: 'file'}` link must end in the file's own name (`.png`, `.jpg`, `.jpeg`, `.mp3`, `.ogg`, `.wav`, `.mp4`, `.ogv`). A Google Drive or OneDrive share page isn't the file: download the file next to the input and give its path.
- **A local file that isn't there**: paths are relative to the input's folder.
- **An image in a question it isn't about**: Asker puts a concept's images, at random, into some of its questions' text as distractors. That's on purpose; only a question that mentions the image is about it.
- **A link that shows on the computer and not in Moodle**: the image is loaded from the web when the question is shown; a local file is embedded in the Moodle XML instead.

## Questions missing or refused

- **Fewer questions in GIFT than in Moodle XML**: GIFT can't carry embedded files or drag-and-drop matching; the `notes` of `generate_questions` say which. Import the Moodle XML.
- **Moodle refuses ordering or ddmatch questions**: ordering is standard from Moodle 4.4, a plugin before; ddmatch is a plugin. Leave them out by type with `exclude_questions`.
- **A concept gives no questions**: it needs a definition or a table, or more concepts in the folder to compare with (`check_input`'s `withoutQuestions`).
- **The misspelled-word questions aren't wanted**: generate with `exclude: ["misspelled"]`, or leave them out with `exclude_questions` after reading them (`read_questions` with `template: "misspelled"`).
- **Different questions every time**: Asker chooses at random. Review and import the same file; don't generate again in between.
