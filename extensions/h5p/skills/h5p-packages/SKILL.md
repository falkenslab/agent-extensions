---
name: h5p-packages
description: Build interactive H5P content as a package with h5p-mcp - multiple choice, true/false, fill in the blanks, drag the words, Dialog Cards, Flashcards, a Question Set or a Course Presentation - in the shape each type's fields take, checked before it's written, in the content's language, with a preview to review before uploading; and read an existing .h5p to review or change it. Use when the person asks for an H5P activity or package, an interactive exercise or self-check that a site such as Moodle plays, or to look inside or edit an .h5p file.
---

# H5P packages

h5p-mcp writes content-only `.h5p` packages on this computer: the content, never H5P's code. It uploads nothing. A package plays only on a site that has its content type installed at the version `list_h5p_types` gives (in Moodle, an administrator installs content types). When it's for a Moodle course and moodle-teacher is there, check first with its `list_h5p_content_types` that the site runs that type at that version, and pick another type or say so if it doesn't; otherwise say it when you hand the package over.

## Which type

`list_h5p_types` lists them, each with what it's for:

- **One question**: `H5P.MultiChoice` (one or more right answers), `H5P.TrueFalse` (a statement).
- **A text with gaps**: `H5P.Blanks` (the student types each answer) or `H5P.DragText` (they drag words into place, distractors allowed).
- **Cards to check oneself**: `H5P.Dialogcards` (turn the card over) or `H5P.Flashcards` (type the answer, then check).
- **Several questions with a score**: `H5P.QuestionSet`, whose questions are multiple choice, true/false, blanks or drag the words.
- **Slides with text and questions**: `H5P.CoursePresentation`, whose elements are text (`H5P.AdvancedText`) or the question types and Dialog Cards.

Images, audio and video aren't supported yet: say so instead of promising them.

## Writing the content

1. **The fields first**: `list_h5p_types` with `type` gives that type's fields (required or not, kind, limits, options, the HTML tags a text allows). Call it for the type, and for each part you put inside a Question Set or a Course Presentation. Never write the content from memory of H5P.
2. **The type's own syntax**, as the fields say: in `H5P.Blanks` each answer goes between asterisks (`*answer*`), alternatives separated by slashes (`*colour/color*`), a tip after a colon (`*answer:tip*`); in `H5P.DragText` each draggable word or phrase between asterisks, and distractors too. A Question Set's questions and a Course Presentation's elements are `{ library, params }`. In a Course Presentation, each element is placed with `x`, `y`, `width` and `height` in percent of the slide: keep them inside it (`x + width` and `y + height` at most 100) and apart from each other.
3. **Text**: plain text is escaped. Use HTML only where a field takes it, and only with the tags it allows.
4. **Language**: pass the content's language (`es`, `en`…) as `language`: the buttons and messages come in it.

## Building and handing it over

- **`build_h5p`** with the type, a title, the language, the content and the folder (`destDir`, absolute, existing). It checks first, with the rules a site applies on deploying it: when it's refused nothing is written, and the error lists what to fix. Fix exactly that and build again; don't drop fields to make it pass.
- It writes `<name>.h5p` and, unless `preview` is false, `<name>.preview.html`. Tell the person where both are, and offer the preview to review the questions and the right answers before it goes anywhere.
- **Overwriting** an existing package (`overwrite: true`) only after the person says so.
- **Uploading** is another extension's: in Moodle, moodle-teacher's `create_activity` with `type: "h5pactivity"` and the package as its file (see its `other-activities` skill). Its `get_h5p_activity` then says the content type Moodle read; if the site lacks the type, say so: the administrator installs it.

## Reading one

`read_h5p` gives a package's type and version, title, language and content in the shape `build_h5p` takes; `supported` says whether this server builds that type at that version. To change one, read it, change the content, and build it again under a new name or, with the person's yes, over it. A package that brings its libraries is read too (its content only).
