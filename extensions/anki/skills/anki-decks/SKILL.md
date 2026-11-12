---
name: anki-decks
description: Write Anki flashcard decks as .apkg files with the anki server - basic, both-ways and cloze cards, with tags, images and audio, subdecks with ::, saved on this computer for the person to import into Anki, AnkiDroid or AnkiMobile - and re-export or add to a deck so its notes update instead of duplicating; read an existing .apkg. Use when the person asks for Anki cards or a deck, flashcards to import into Anki, an .apkg, or to look inside or extend one.
---

# Anki decks

The anki server writes `.apkg` files on this computer: it uploads nothing and syncs nothing. The person imports the file into Anki; their progress lives in their Anki, not in the file. This skill is about the format. What to put in a deck, what to review and when (spaced repetition, mock exams) is the person's or their study agent's call, not this extension's.

## The tools

- **`write_deck`** writes a new deck: `path` (absolute, ending in `.apkg`, in a folder that exists), `deck`, optional `description`, `noteType` for the cards (each card can override it with `type`), `cards`, `tags` for all of them, `media` (absolute paths) and `overwrite`.
- **`add_to_deck`** writes a new `.apkg` with everything an existing one (`source`) holds plus the cards given: same inputs, with `deck` optional (by default, the deck with most cards).
- **`read_deck`** reads an `.apkg` without changing it: its decks, note types, media names and a page of notes (`offset`, `limit`, the previous page's `next`), each with its `guid` and `asCard`, the card in the shape `write_deck` takes. It only reads.
- **`server_info`** gives the server's version, note types, formats and limits. It only reads.

## Which note type

- **`basic`**: `front` → `back`. The default: a question, a term, a prompt, with one answer.
- **`basic-reversed`**: also `back` → `front`, two cards per note. Only when both directions make sense on their own (a word and its translation, a country and its capital), not for a question and its explanation.
- **`cloze`**: `text` with deletions to fill in: `{{c1::answer}}`, or `{{c1::answer::hint}}` with a hint shown in the gap. Each number is one card: `{{c1::…}}` and `{{c2::…}}` make two, and two deletions with the same number are hidden together on one card. For a fact inside its sentence, a definition, a list item or a formula's term.
- **`extra`** (any type) shows under the answer: an example, a source, a mnemonic. Not a second answer.

The note types the server writes are its own (`Basic (with Extra)`, `Basic and reversed (with Extra)`, `Cloze (with Extra)`), next to the person's own in Anki.

## What a card takes

What each card asks is the person's, or comes from the agent's own way of studying; this is what Anki takes.

- **Fields are HTML**, as Anki keeps them: `<b>`, `<i>`, `<u>`, `<br>`, lists, tables, `<code>`, `<sub>`/`<sup>`; a new line becomes `<br>`. Write a literal `<` as `&lt;` (and `&` as `&amp;` where it could read as an entity). Scripts, `<style>` blocks, iframes, forms and event handlers (`onclick=`…) are refused, with what to fix.
- **The first field identifies the note** (see below): two cards in a deck can't share it. A duplicate is refused; merge them or make the fronts differ.
- **Tags** have no spaces (a space becomes `_`); `Parent::child` makes a tag hierarchy. Tag by what the person will filter or search by (topic, unit, source), with the deck-wide ones in `tags`.

## Media

Pass each image or audio file's absolute path in `media` and reference it in a field by its file name only: `<img src="cell.png">`, `[sound:hola.mp3]`. A reference with no file in `media` is refused; a file nobody references is reported. Two files can't share a name: rename one. Web addresses in `src` aren't media and won't show offline: download the file first and pass it in `media`, with the person's yes for what's downloaded.

## Decks and subdecks

`deck` is the name the person sees in Anki; `Parent::Child` makes a subdeck (the parents are made too), such as `Biology::Unit 3`. Use the name the person gives, or a short one for the subject and unit; one deck per call (a package from `add_to_deck` keeps its other decks). `description` is the deck's overview text in Anki.

## Exporting again, and adding to a deck

A note's id (its guid) comes from the deck name and its first field, and every note type has a fixed id. So:

- **Re-exporting the same deck updates it**: writing the deck again with the same `deck` and fronts (corrected backs, new tags, more cards) and importing it updates those notes in Anki and keeps the person's progress, rather than duplicating them. Keep the deck name the same; renaming it, or changing a card's front or cloze text, makes a new note.
- **To change a front and keep the note**, read the earlier export with `read_deck` and pass that note's `guid` with the new front.
- **To add to a deck whose `.apkg` the person has**, use `add_to_deck` with it as `source` and a new `path`: the old notes keep their ids and media, a card matching one updates it, and the rest are added. For a deck written with `write_deck`, writing the whole deck again with the new cards does the same.
- A deck only in the person's Anki, without a file, must be exported first: in Anki desktop, File > Export, "Anki Deck Package (.apkg)", with "Support older Anki versions" ticked (the server reads only that format; `read_deck` says so when it isn't). Scheduling isn't needed.

## Where to save, and overwriting

Ask where to save if the person hasn't said; a folder they'll find (Downloads, the course's folder) and a file name from the deck (`biology-unit-3.apkg`). Never write over an existing file without the person's yes: `write_deck` and `add_to_deck` refuse unless `overwrite: true`. When it's done, say the path, how many notes and cards, and how to import it.

## How the person imports it

- **Anki desktop** (Windows, macOS, Linux): File > Import and choose the file, or double-click the `.apkg`. When asked, keep updating notes that are newer. The deck appears in the deck list.
- **AnkiDroid** (Android): open the `.apkg` from the phone's files or a download (Share or Open with AnkiDroid), or in AnkiDroid's menu, Import.
- **AnkiMobile** (iPhone, iPad): open the file from Files, Mail or AirDrop with "Copy to Anki" (or share it to Anki).
- **AnkiWeb**: import on a device and sync; AnkiWeb itself can't import an `.apkg`.
