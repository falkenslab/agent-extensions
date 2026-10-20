---
name: designs
description: Work the person's Canva designs through Canva's official MCP server - finding them, creating one from a description, a copy, another size or a file, editing texts, images and pages, folders and comments - knowing what needs the person's yes and what their Canva plan allows. Use whenever the person asks for a presentation, poster, infographic, worksheet or any other Canva design, or to find, change or comment on one.
---

# Designs in Canva

Canva's MCP server works on the person's own Canva account, signed in from the chat (`/extensions sign-in canva` in an agent on agent-kit, `/mcp` in Claude Code). If its tools aren't there or say the person isn't signed in, tell them how to sign in instead of trying something else. Everything the server does happens in their account, visible to whoever they share with: reads need no yes, anything that creates or changes something does. What goes to Canva leaves this computer: see `what-goes-to-canva` before sending names or other people's data.

## The yes before creating or changing

Before any tool that creates or changes something in their account (`create-design`, `generate-design`, `generate-design-structured`, `create-design-from-candidate`, `copy-design`, `resize-design`, `merge-designs`, `import-design-from-url`, `edit-design` saving, `create-folder`, `move-item-to-folder`, `comment-on-design`, `reply-to-comment`), say exactly what will happen and ask a yes-or-no question, then wait for the answer:

- **What**: the type and size, the title, and the content in a few lines (the sections or slides, the texts that go in), or the exact change.
- **Where**: in their Canva account (and which folder, if any).
- **The question**: "Shall I create it?", "Shall I save these changes?". Only a clear yes goes on.

Asking which format, style or option they want is not that yes: when the person picks an option, show what will be created with it and ask again. The person asking for a design ("make me a cheatsheet") isn't that yes either: they asked for one, not for this one. One yes covers the one action it was asked for.

## Finding

- **A design**: `search-designs` (theirs and the ones shared with them); `search-folders` and `list-folder-items` to look in a folder. A `canva.link` link the person pastes goes through `resolve-shortlink` first.
- **What it holds**: `read-design` gives its texts, pages, thumbnails, presenter notes and data. Read it before editing, exporting or describing it, never guess its content. Don't open an editing session from it (`open_transaction`) just to look.
- **How do I… in Canva**: `help` answers from Canva's Help Center; use it rather than guessing how a Canva feature works.

## Creating

1. **Agree on what**: the type (presentation, poster, infographic, worksheet, social post…), the topic, the number of pages or slides, the language and the audience. Then show what will be created and **wait for the person's yes** (above) before calling anything.
2. **`create-design`** from a description is the default. It may run as a job: follow it with `get-create-design-async-job` until it's done, then give the person the design's link.
3. **Check what Canva wrote**: `read-design` and read every text it generated before saying it's ready. Canva's generation makes mistakes (misspelt commands, wrong terms, made-up facts): list them for the person and offer to fix them (`edit-design`, with its own yes).
4. **The older path**, only when `create-design` isn't enough (above all, a design in the person's brand, see `brand`): `generate-design` makes proposals that aren't saved; show them and keep the one the person picks with `create-design-from-candidate`. For a presentation from an outline: `request-outline-review` shows the outline to the person, and `generate-design-structured` builds it once they approve it.
5. **From something that exists**: `copy-design` (the whole design or some pages), `resize-design` (a copy in another size; on a Free plan only a limited trial, so say so if it fails), `import-design-from-url` (a PDF, PPTX, DOCX or HTML at a public address: never a private file's link the person didn't choose to share).

## Editing

- **`edit-design`** changes texts, images, shapes, pages and notes, and saves or discards the changes. Read the design first, say exactly what will change (which page, which text, from what to what), and save only after the person's yes; when unsure, discard.
- **`merge-designs`** joins designs and inserts, moves or deletes pages. Deleting pages is permanent: name the pages and ask first.
- **Folders**: `create-folder` and `move-item-to-folder` to keep their designs tidy, when they ask.

## Comments

`list-comments` and `list-replies` read a design's comments. `comment-on-design` and `reply-to-comment` write as the person, seen by everyone with access to the design: show the text and ask before posting.

## What Canva imposes

- Premium elements (some photos, fonts, templates) may need a paid plan: an export can fail with `license_required`. Say so and offer to replace them with free ones.
- Brand kits and brand templates are Canva Pro and above (see `brand`); resizing is limited on Free.
- Canva limits how fast tools can be called (about 20 creations or copies a minute, 300 calls a minute overall): batch requests and don't loop on a failing call.
- Images inside a design: see `images`. Exporting it to a file or a link: see `export`.
