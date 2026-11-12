// The anki extension's MCP server: writes Anki decks as .apkg packages on this computer, adds to an existing
// package, and reads one. Nothing native and no network: sql.js and fflate, bundled into dist/server.mjs.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { addToDeck, LIMITS, NOTE_TYPES, readDeck, writeDeck } from "./apkg.mjs";

const VERSION = "0.1.0";

const server = new McpServer(
  { name: "anki", version: VERSION },
  { instructions: "Anki decks as .apkg files on this computer: write_deck writes a new deck from cards (basic, basic and reversed, cloze; tags; images and audio), add_to_deck writes a copy of an existing .apkg with more or corrected cards, read_deck reads one. It uploads nothing: the person imports the file into Anki. Exporting the same deck again updates its notes in Anki instead of duplicating them." },
);

const noteType = z.enum(["basic", "basic-reversed", "cloze"]);
const card = z
  .object({
    type: noteType.optional().describe("This card's note type, when it isn't the call's noteType"),
    front: z.string().optional().describe("basic and basic-reversed: the question side (HTML allowed; a new line becomes <br>)"),
    back: z.string().optional().describe("basic and basic-reversed: the answer side"),
    text: z.string().optional().describe("cloze: the text with its deletions, {{c1::answer}} or {{c1::answer::hint}}; each number (c1, c2…) is one card"),
    extra: z.string().optional().describe("Optional: shown under the answer (an example, a source, a mnemonic)"),
    tags: z.array(z.string()).optional().describe("This card's tags, besides the call's tags (no spaces; Parent::child for a hierarchy)"),
    guid: z.string().optional().describe("Only to keep an existing note's identity when its first field changes: the guid read_deck gave for it"),
  })
  .strict();
const common = {
  path: z.string().describe("Absolute path of the .apkg to write, in a folder that exists"),
  deck: z.string().describe("Deck name; Parent::Child for a subdeck"),
  description: z.string().optional().describe("The deck's description, shown in Anki on the deck's overview (HTML allowed)"),
  noteType: noteType.default("basic").describe("The cards' note type: basic (front → back), basic-reversed (also back → front) or cloze (fill the gap)"),
  cards: z.array(card).min(1).max(LIMITS.cards).describe("The cards, one note each"),
  tags: z.array(z.string()).optional().describe("Tags for every card"),
  media: z.array(z.string()).optional().describe("Absolute paths of images and audio the fields reference by file name: <img src=\"cell.png\">, [sound:word.mp3]"),
  overwrite: z.boolean().default(false).describe("Write over an existing file at path: only with the person's yes"),
};

/** A tool's reply: the text, or the error as a tool error the agent can act on. */
const reply = (run) => async (input) => {
  try {
    return { content: [{ type: "text", text: await run(input) }] };
  } catch (failure) {
    return { isError: true, content: [{ type: "text", text: failure instanceof Error ? failure.message : String(failure) }] };
  }
};
const size = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const unused = (names) => (names.length ? `\nNot referenced by any field (still in the package): ${names.join(", ")}.` : "");

server.registerTool(
  "write_deck",
  {
    title: "Write an Anki deck",
    description: "Writes a new Anki deck as an .apkg file on this computer, ready to import into Anki (desktop, AnkiDroid, AnkiMobile). Each card is a note: basic (front and back), basic-reversed (a card each way) or cloze ({{c1::…}} deletions, one card per number); with optional extra, tags, and images or audio referenced by file name in the fields and passed as absolute paths in media. Fields are HTML (a new line becomes <br>); scripts and event handlers are refused. Notes get ids from the deck name and their first field, so exporting the same deck again updates its notes in Anki instead of duplicating them. It never writes over a file unless overwrite is true.",
    inputSchema: common,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  reply(async ({ path: file, ...input }) => {
    const r = await writeDeck({ file, ...input });
    return `Wrote ${r.file} (${size(r.bytes)}): deck "${r.deck}", ${plural(r.added, "note", "notes")}, ${plural(r.cards, "card", "cards")}, ${plural(r.media, "media file", "media files")}.${unused(r.unusedMedia)}\nThe person imports it in Anki with File > Import (or by opening the file); in AnkiDroid and AnkiMobile, by opening it from the phone's files.`;
  }),
);

server.registerTool(
  "add_to_deck",
  {
    title: "Add cards to an Anki package",
    description: "Writes a new .apkg with everything an existing .apkg holds (its notes, note types, decks, media and ids) plus the cards given: a card whose deck and first field (or guid) match a note already there updates that note instead. Imported into Anki, the old notes stay as they are (or are updated) and the new ones are added. Cards go to deck, or, if it isn't given, to the deck that holds most cards. Reads packages exported in Anki's legacy format (collection.anki2 or .anki21); a newer one must be exported again with \"Support older Anki versions\" ticked. The source is never changed unless path is the source and overwrite is true.",
    inputSchema: { source: z.string().describe("Absolute path of the existing .apkg"), ...common, deck: z.string().optional().describe("The deck to add to (Parent::Child for a subdeck, made if missing); by default the one with most cards") },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  reply(async ({ path: file, ...input }) => {
    const r = await addToDeck({ file, ...input });
    return `Wrote ${r.file} (${size(r.bytes)}) from ${r.source}: deck "${r.deck}", ${plural(r.added, "note", "notes")} added, ${plural(r.updated, "note", "notes")} updated, ${plural(r.cards, "card", "cards")} for them, ${plural(r.media, "media file", "media files")} in all.${unused(r.unusedMedia)}\nImported into Anki, it adds the new notes and updates the changed ones; the person's progress on the others stays.`;
  }),
);

server.registerTool(
  "read_deck",
  {
    title: "Read an Anki package",
    description: "Reads an .apkg on this computer, without changing it: its decks (with how many notes and cards), note types (fields and card templates), media file names, and a page of its notes, each with its guid, note type, deck, fields, tags, whether it has been studied, and asCard, the card as write_deck and add_to_deck take it (with its guid) when its note type is a basic, reversed or cloze one. Reads Anki's legacy format (collection.anki2 or .anki21).",
    inputSchema: {
      path: z.string().describe("Absolute path of the .apkg"),
      deck: z.string().optional().describe("Only the notes in this deck and its subdecks"),
      offset: z.number().int().min(0).default(0).describe("Notes to skip: the previous page's next"),
      limit: z.number().int().min(1).max(200).default(50).describe("Notes per page"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  reply(async ({ path: file, ...options }) => JSON.stringify(await readDeck(file, options), null, 1)),
);

server.registerTool(
  "server_info",
  {
    title: "About the anki server",
    description: "This server's version, the note types it writes with their fields, the formats it reads and writes, and its limits.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  reply(async () =>
    JSON.stringify(
      {
        name: "anki",
        version: VERSION,
        writes: ".apkg with collection.anki2 (Anki's legacy schema 11), which Anki 2.0 and later, AnkiDroid and AnkiMobile import",
        reads: ".apkg (and .colpkg) with collection.anki2 or collection.anki21; not the newer collection.anki21b",
        noteTypes: Object.fromEntries(Object.entries(NOTE_TYPES).map(([key, t]) => [key, { name: t.name, fields: t.fields, cards: t.templates.map((tmpl) => tmpl.name) }])),
        limits: { cardsPerCall: LIMITS.cards, mediaMB: LIMITS.mediaBytes / 1024 / 1024, charactersPerField: LIMITS.fieldChars },
        network: "none: it reads and writes files on this computer only",
      },
      null,
      1,
    ),
  ),
);

await server.connect(new StdioServerTransport());
