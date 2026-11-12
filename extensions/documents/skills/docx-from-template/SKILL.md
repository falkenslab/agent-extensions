---
name: docx-from-template
description: Write a Word document (.docx) in the person's template with the documents server - read the template's styles, placeholders and content marker first, write the content as Markdown that maps onto those styles, fill the placeholders, size the images, save it where it belongs without overwriting, and read it back to check it before the person opens it in Word or LibreOffice. Use when the person asks for a .docx, a Word document, or a document in their school's (or company's) template, or when another skill needs a document written in a template.
---

# A .docx from a template

The documents server writes Word documents on this computer from a template and Markdown. It keeps the template whole (its styles, page size and margins, header, footer and logo) and puts the content in its body. It uploads and sends nothing. It knows the format, not what the document should say: what goes in it comes from the person or from the skill that asked for it.

## 1. Read the template first

- **Which template**: the one the person gives or points to (a `.docx` or `.dotx`; in an agent with sources, usually in `sources/`). A `.doc`, `.docm` or `.dotm` isn't read: ask them to save it as `.docx` in Word or LibreOffice. With no template, `write_docx` uses a clean A4 document: say so, and don't present it as the school's format.
- **`read_template`** with its absolute path, before writing anything. It gives:
  - `roles`: the style the template uses for each part of the Markdown (`heading1`…`heading6`, `paragraph`, `listBullet`, `listNumber`, `quote`, `code`, `caption`, `table`, `hyperlink`), found by Word's built-in names, localized names (`Título 1`, `Párrafo de lista`) or outline level. `null` means the template has none and `write_docx` will add Word's built-in one, plain-looking next to the template's own.
  - `headingLevels`: the heading levels it defines. Write the Markdown with those levels: if it defines only two, use `#` and `##`, not `###`.
  - `styles`: every style by kind, with its id and name. A role found wrong, or a custom style meant for it (a school's own "Título informe"), is chosen with `write_docx`'s `styles` (`{ "heading1": "Título informe" }`, by name or id).
  - `placeholders`: the `{{fields}}` in the body, header and footer (course, module, date, author…).
  - `contentMarker`: whether a paragraph `{{content}}` says where the document goes. With it, the template's own body before and after it (a cover, a signature block) stays. Without it, the template's body is replaced, unless `templateBody: "append"` keeps it and adds the document after it.
  - `body.firstLines`: what the template's body holds now, with the style of each line. When it's a model to follow (sections with headings and instructions to replace), follow its sections and their order, and say so; replacing it is right only if nothing in it must stay.
  - `page`: size, margins and text width, for sizing images and wide tables.

## 2. Write the Markdown for those styles

- One paragraph per line. Headings with `#`, at the levels the template has. Lists with `-` or `1.` (nested by indenting); a numbered list restarts at its first number. Tables in GitHub's syntax, with `:--` / `--:` for alignment; they take the template's table style and the text width, and the header row repeats on each page. Bold, italic, `~~strike~~`, `code` and links work inline. `> quote` and fenced code blocks take the quote and code styles.
- **Page breaks**: `\pagebreak` (or `<!-- pagebreak -->`) on a line of its own. **Table of contents**: `[toc]` on its own line; it shows the headings at once and Word offers to update the field (page numbers) on opening.
- **Images**: PNG, JPEG or GIF files on this computer, `![What it shows](chart.png){width=12cm}` (cm, mm, in, pt, px or % of the text width; the height keeps the proportion). Without a width they take their own size, and anything wider than the text is scaled down. Relative paths start from `markdownFile`'s folder or from `imagesDir`. An SVG or WebP must be converted to PNG first, and a web image downloaded first: the server goes on no network. Write the alt text: it's what a screen reader says.
- **Placeholders**: `values` fills each `{{field}}` the template has, in the body, header and footer, even when Word split it across runs; a newline in a value becomes a line break. Ask the person for any value you don't know rather than guessing it; `{{field}}` written in the Markdown is filled too. The result lists the fields left without a value and the values that matched nothing.
- Long content: write it to a `.md` file and pass `markdownFile`, rather than a very long `markdown` string.

## 3. Save it

- **`write_docx`** with `template`, `markdown` or `markdownFile`, `values`, `title` (the document's properties) and `output`: an absolute path ending in `.docx`, where the person or the asking skill says (an agent's `drafts/` or the folder of the template's documents); its folder is created if missing. Name it so it's found (`annual-report-2026-programming.docx`).
- It never replaces an existing file: when one is there, pick another name, or pass `overwrite: true` only after the person says to replace it. If it can't write because the file is open in Word or LibreOffice, ask them to close it.
- Its result lists the style used for each role, the styles it had to add, counts (headings, lists, tables, images), the placeholders filled and left, and warnings (an image scaled down, a level-7 heading written as 6). Read the warnings, fix what's yours (a heading level the template lacks, a missing value) and write it again under the same name with `overwrite: true` (your own file, just written).

## 4. Check it, then hand it over

- **`read_docx`** on the result: each paragraph with its style in brackets (`[Título 1] # Results`), the tables, images and page breaks, the header and footer text, `placeholdersLeft` and `missingStyles`. Check that headings took heading styles (not `Normal`), that no `{{field}}` is left that should be filled, that `missingStyles` is empty, and that the template's cover and signature are where they should be.
- Tell the person where the file is, which template and styles it used, what was added or left empty, and that they open and review it in Word or LibreOffice before it goes anywhere: the layout (page breaks, image sizes, wide tables) is only seen there. Sending, printing or uploading it is theirs.
- To change it, change the Markdown and write it again; don't edit the `.docx` by other means. A document the person has already edited by hand isn't regenerated over without their yes: their changes would be lost.
- `server_info` gives the server's version, the Markdown it understands and its limits (no footnotes, comments or tracked changes in what it writes).
