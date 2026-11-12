---
name: style-content
description: Give what's published in Moodle a clean visual style with moodle-ui-kit's templates - an assignment's statement (goal, statement, deliverable), code blocks, a solution with its explanation, a quiz question's text and its feedback - all with inline styles, so it works on Moodle sites that strip CSS. Use when writing an assignment, a page, a label, a quiz question or feedback for Moodle and the person wants this style, or the course has no style of its own to follow.
---

# Styling content for Moodle

Six templates, adapted from [@noeper](https://github.com/noeper)'s [moodle-ui-kit](https://github.com/noeper/moodle-ui-kit) (CC0): every style is inline, because many Moodle sites (regional education departments' among them) don't allow CSS or theme changes in statements and questions. None sets a font or a background over the course's theme (only the colored title bars and the code blocks keep theirs), so the content follows the theme's font and still reads in a dark one.

## When

- **The course already has a style**: read two or three of its activities first (with moodle-teacher, `get_course_structure` lists them, `get_activity_content` reads a page's or label's HTML, `get_activity_settings` an assignment's description), and follow it, not these templates, unless the person asks for this one.
- **An empty course, or the person asks for it**: use the templates for everything of the same kind, so the course reads as one.

## Which template

| Template | For |
| --- | --- |
| [`templates/activity.html`](templates/activity.html) | An assignment's statement, or an exercise in a page: title, goal, statement, deliverable |
| [`templates/code.html`](templates/code.html) | A block of code or commands to copy, inside a statement or a page |
| [`templates/feedback.html`](templates/feedback.html) | A solution with its explanation and code: an assignment's feedback, a cloze question's general feedback |
| [`templates/page.html`](templates/page.html) | A page's or label's content that isn't an exercise: notes, instructions, a unit's introduction |
| [`templates/question.html`](templates/question.html) | A quiz question's text, in a bordered box |
| [`templates/question-feedback.html`](templates/question-feedback.html) | A quiz answer's or question's feedback |

Read the template file, then fill it in.

## Filling it in

- **Placeholders** in capitals between brackets: replace each one; none may stay. Leave out a section that doesn't apply (an exercise with no deliverable) rather than leaving it empty.
- **Labels** (`[GOAL LABEL]`, `[STATEMENT LABEL]`…) in the course's language: Goal / Objetivo, Statement / Enunciado, Deliverable / Entregable, Select and copy / Selecciona y copia, Solution / Solución, Explanation / Explicación, Code / Código, Feedback / Retroalimentación.
- **Keep the inline styles as they are**: no `<style>`, no classes, no external CSS; sites strip them. The colors keep a readable contrast (white on blue or green); don't change them for paler ones, and don't add a `font-family` or a background: the theme gives those.
- **Headings** are real: the activity's title is an `<h2>` (Moodle shows the activity's name as the page's `<h1>`), its sections `<h3>`. Keep that order.
- **Code** inside `<pre><code>`: escape `<`, `>` and `&` as `&lt;`, `&gt;` and `&amp;`, keep the indentation exactly, and nothing else inside the `<pre>`.
- **The emojis** are decoration, each inside `<span aria-hidden="true">` so screen readers skip it: the label beside each one says the same, so meaning never depends on them. Keep the span when filling in, and wrap any emoji you add the same way.

## Publishing it in Moodle

With moodle-teacher's tools (its `publishing` skill: hidden first, checked, then shown; every write needs the person's yes):

- **An assignment, a page or a label**: the filled template is the HTML of `description` (assignment) or `content` (page, label) in `create_activity` or `update_activity`.
- **A quiz question**: `create_question` takes the HTML as `text`; for several, `import_questions` in **Moodle XML**, with the HTML inside `<text><![CDATA[ … ]]></text>`. Avoid GIFT for styled questions: its special characters `: # = ~ { }` are everywhere in inline styles (`color: #4174c0`), and every one would have to be escaped with a backslash, attributes included.
- **Feedback**: a quiz answer's feedback in the same XML or form; an assignment's feedback in `grade_submission`'s `feedback`.

Without moodle-teacher (none of those tools available), don't publish: give the person the filled HTML in a code block, say where it goes (the assignment's description, the page's content, the question's text or feedback) and that it must be pasted in the editor's HTML or source view ("Source code" in TinyMCE's Tools menu, the HTML button in Atto), not in the visual view, which would show the tags as text.

## Checking it

Before saving, `validate_html` (moodle-mcp) reports tags left open and what Moodle's cleaning removes. It doesn't decide inline styles: whether `style` attributes survive is the site's HTML filter, the same for all of a teacher's content.

After saving, read it back (`get_activity_content` for a page or label, `get_activity_settings` for an assignment's description): if the site's HTML filter removed the `style` attributes, the content arrives plain. Tell the person instead of saving it again: that's the site's setting, and only its administrator changes it.

A quiz question's HTML is checked through an export: `export_questions` in `xml` of the category you imported into, then read the file: each question's `<text>` must still have its `style` attributes. If an assignment or a page already showed the site keeps styles, that check is enough for the rest. Then, for everything, the person previews it as a student (a quiz's "Preview" doesn't count in the results).
