// Anki packages (.apkg): a zip with collection.anki2 (Anki's legacy SQLite collection, schema 11, which every
// Anki version still imports), a "media" JSON ({"0": "cell.png"}) and the media files named 0, 1, 2… Built with
// sql.js (SQLite compiled to WebAssembly, inlined) and fflate: nothing native, no network.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import initSqlJs from "sql.js/dist/sql-wasm-inline.js";

let sqlJs;
/** sql.js, loaded once. */
export const sqlite = async () => (sqlJs ??= await initSqlJs());

export const LIMITS = { cards: 5000, mediaBytes: 200 * 1024 * 1024, fieldChars: 100_000 };

// The note types, with stable ids: the same note type in every export, so Anki recognizes it on re-import.
const ANSWER = "{{FrontSide}}\n\n<hr id=answer>\n\n";
const EXTRA = "{{#Extra}}<br><br><div class=\"extra\">{{Extra}}</div>{{/Extra}}";
const CSS = ".card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}\n\n.extra {\n  font-size: 16px;\n  color: #555;\n}\n\n.nightMode .extra {\n  color: #bbb;\n}\n";
export const NOTE_TYPES = {
  basic: {
    name: "Basic (with Extra)",
    kind: 0,
    fields: ["Front", "Back", "Extra"],
    templates: [{ name: "Card 1", qfmt: "{{Front}}", afmt: `${ANSWER}{{Back}}${EXTRA}` }],
    css: CSS,
  },
  "basic-reversed": {
    name: "Basic and reversed (with Extra)",
    kind: 0,
    fields: ["Front", "Back", "Extra"],
    templates: [
      { name: "Card 1", qfmt: "{{Front}}", afmt: `${ANSWER}{{Back}}${EXTRA}` },
      { name: "Card 2", qfmt: "{{Back}}", afmt: `${ANSWER}{{Front}}${EXTRA}` },
    ],
    css: CSS,
  },
  cloze: {
    name: "Cloze (with Extra)",
    kind: 1,
    fields: ["Text", "Back Extra"],
    templates: [{ name: "Cloze", qfmt: "{{cloze:Text}}", afmt: "{{cloze:Text}}<br>\n{{Back Extra}}" }],
    css: `${CSS}\n.cloze {\n  font-weight: bold;\n  color: blue;\n}\n\n.nightMode .cloze {\n  color: lightblue;\n}\n`,
  },
};

const sha = (algorithm, text) => createHash(algorithm).update(text).digest();
/** A stable id, shaped like Anki's (milliseconds since 1970: some date between 2014 and 2017). */
export const stableId = (text) => 1_400_000_000_000 + Number(sha("sha1", text).readBigUInt64BE(0) % 100_000_000_000n);
export const noteTypeId = (type) => stableId(`falkenslab/anki note type ${type} v1`);
export const deckId = (name) => stableId(`falkenslab/anki deck ${name}`);

// Anki's guids are 64 bits in base 91, with this alphabet.
const BASE91 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
function base91(value) {
  let out = "";
  do {
    out = BASE91[Number(value % 91n)] + out;
    value /= 91n;
  } while (value > 0n);
  return out;
}
/** A note's guid from its deck and its first field, so the same card exported again updates the note in Anki. */
export const guidFor = (deck, firstField) => base91(sha("sha256", `${deck}\x1f${stripHtmlMedia(firstField)}`).readBigUInt64BE(0));

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
/** A field as text, keeping media file names (what Anki sorts and checksums). */
export function stripHtmlMedia(html) {
  return html
    .replace(/<img[^>]*?\bsrc\s*=\s*["']?([^"'\s>]+)[^>]*>/gi, " $1 ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code) => {
      if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? all;
      return String.fromCodePoint(code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
    })
    .trim();
}
/** Anki's checksum of a note: the first 8 hex digits of the sha1 of its first field, as text, as an integer. */
export const checksum = (firstField) => parseInt(sha("sha1", stripHtmlMedia(firstField)).toString("hex").slice(0, 8), 16);

// What a field may hold: the HTML Anki's editor writes, no scripts, no event handlers.
const ALLOWED_TAGS = new Set("a abbr b big blockquote br caption center cite code col colgroup dd del dfn div dl dt em font h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p pre q rp rt ruby s samp small span strike strong sub sup table tbody td tfoot th thead tr tt u ul var".split(" "));
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(\s[^<>]*)?\/?>/y;
/** What's wrong with a field's HTML, as messages; none if it's fine. */
export function htmlProblems(html) {
  const problems = [];
  for (let i = html.indexOf("<"); i >= 0; i = html.indexOf("<", i + 1)) {
    if (!/[a-zA-Z/!?]/.test(html[i + 1] ?? "")) continue; // "a < b" is text
    TAG.lastIndex = i;
    const tag = TAG.exec(html);
    if (!tag) {
      problems.push(`"${html.slice(i, i + 12)}…" opens no valid tag: write a literal < as &lt;`);
      continue;
    }
    const [, , name, attributes = ""] = tag;
    if (!ALLOWED_TAGS.has(name.toLowerCase())) problems.push(`<${name}> isn't allowed in a field (use plain formatting: b, i, u, br, div, ul/ol/li, table, img, code, sub, sup…)`);
    if (/\bon[a-z]+\s*=/i.test(attributes)) problems.push(`<${name}> has an event handler (on…=), which isn't allowed`);
    if (/javascript:/i.test(attributes)) problems.push(`<${name}> has a javascript: link, which isn't allowed`);
  }
  return problems;
}
/** The media files a field references: <img src="…"> and [sound:…], not web addresses. */
export function mediaReferences(html) {
  const names = [];
  for (const m of html.matchAll(/<img[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) names.push(m[1] ?? m[2] ?? m[3]);
  for (const [, name] of html.matchAll(/\[sound:([^\]]+)\]/g)) names.push(name);
  return names.filter((name) => !/^[a-z][a-z0-9+.-]*:/i.test(name)).map((name) => {
    try { return decodeURIComponent(name); } catch { return name; }
  });
}
const CLOZE = /\{\{c(\d+)::/g;

/** A deck name's parts (A::B::C), checked. */
export function deckParts(name) {
  const parts = String(name ?? "").split("::").map((part) => part.trim());
  if (!parts.length || parts.some((part) => !part)) throw new Error(`"${name}" isn't a deck name: write it as "Deck" or, for a subdeck, "Parent::Child", with no empty part.`);
  return parts;
}
const normalTags = (tags = []) => [...new Set(tags.map((tag) => String(tag).trim().replace(/\s+/g, "_")).filter(Boolean))];

/**
 * A card from the tool's input, checked: its note type, fields (in the type's order), the card numbers (ords)
 * it makes, tags, and the media it references. Throws with every problem found, prefixed with the card's number.
 */
export function checkCard(card, index, defaultType) {
  const type = card.type ?? defaultType;
  const where = `Card ${index + 1}`;
  const problems = [];
  if (!NOTE_TYPES[type]) throw new Error(`${where}: unknown note type "${type}" (basic, basic-reversed or cloze).`);
  const nl = (text) => String(text ?? "").replace(/\r\n?/g, "\n").trim().replace(/\n/g, "<br>");
  let fields;
  let ords;
  if (type === "cloze") {
    const text = nl(card.text ?? card.front);
    if (card.back) problems.push("a cloze card has no back: put what goes after the text in extra");
    if (!text) problems.push("a cloze card needs text, with deletions like {{c1::answer}}");
    const numbers = [...new Set([...text.matchAll(CLOZE)].map((m) => Number(m[1])))].sort((a, b) => a - b);
    if (text && !numbers.length) problems.push("its text has no cloze deletion: mark the answer as {{c1::answer}} (or {{c1::answer::hint}}); {{c2::…}} makes a second card");
    if (numbers.includes(0)) problems.push("cloze numbers start at 1: {{c1::…}}, not {{c0::…}}");
    if ((text.match(/\{\{/g) ?? []).length !== (text.match(/\}\}/g) ?? []).length) problems.push("its {{ and }} don't pair up");
    fields = [text, nl(card.extra)];
    ords = numbers.filter((n) => n > 0).map((n) => n - 1);
  } else {
    if (card.text) problems.push(`text is for cloze cards: a ${type} card has front and back`);
    const front = nl(card.front);
    const back = nl(card.back);
    if (!front) problems.push("it has no front");
    if (!back) problems.push("it has no back");
    if (/\{\{c\d+::/.test(front + back)) problems.push(`it has a cloze deletion ({{c1::…}}): make it a cloze card (type "cloze", with text) or remove the braces`);
    fields = [front, back, nl(card.extra)];
    ords = type === "basic-reversed" ? [0, 1] : [0];
  }
  for (const [i, field] of fields.entries()) {
    if (field.length > LIMITS.fieldChars) problems.push(`its ${NOTE_TYPES[type].fields[i]} is longer than ${LIMITS.fieldChars} characters`);
    for (const problem of htmlProblems(field)) problems.push(`${NOTE_TYPES[type].fields[i]}: ${problem}`);
  }
  if (problems.length) throw new Error(`${where}: ${problems.join("; ")}.`);
  return { type, fields, ords, tags: normalTags(card.tags), guid: card.guid, media: fields.flatMap(mediaReferences) };
}

/** The media files to add, from absolute paths, checked and read. */
export function readMedia(paths = []) {
  const media = [];
  let bytes = 0;
  for (const file of paths) {
    if (!path.isAbsolute(file)) throw new Error(`Media "${file}" isn't an absolute path.`);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`Media "${file}" doesn't exist or isn't a file.`);
    const name = path.basename(file);
    if (media.some((m) => m.name === name)) throw new Error(`Two media files are called "${name}": Anki keeps one per name, so rename one.`);
    const data = readFileSync(file);
    bytes += data.length;
    if (bytes > LIMITS.mediaBytes) throw new Error(`The media add up to more than ${LIMITS.mediaBytes / 1024 / 1024} MB: split the deck or shrink the files.`);
    media.push({ name, data: new Uint8Array(data) });
  }
  return media;
}

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

const deckJson = (id, name, description, now) => ({
  id, name, desc: description ?? "", mod: Math.floor(now / 1000), usn: -1, dyn: 0, conf: 1, collapsed: false, browserCollapsed: false,
  extendNew: 10, extendRev: 50, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0],
});
const DECK_CONF = {
  1: {
    id: 1, name: "Default", mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false,
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
    rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200, hardFactor: 1.2 },
    lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
  },
};
function noteTypeJson(type, did, now) {
  const t = NOTE_TYPES[type];
  return {
    id: noteTypeId(type), name: t.name, type: t.kind, mod: Math.floor(now / 1000), usn: -1, sortf: 0, did, tags: [], vers: [],
    flds: t.fields.map((name, ord) => ({ name, ord, sticky: false, rtl: false, font: "Arial", size: 20, media: [] })),
    tmpls: t.templates.map((tmpl, ord) => ({ ...tmpl, ord, bqfmt: "", bafmt: "", did: null, bfont: "", bsize: 0 })),
    css: t.css,
    latexPre: "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: t.kind === 1 ? [[0, "any", [0]]] : t.templates.map((_, ord) => [ord, "any", [ord]]),
  };
}

/** A new, empty collection: the col row with the Default deck and its options. */
export async function newCollection(now = Date.now()) {
  const db = new (await sqlite()).Database();
  db.run(SCHEMA);
  const conf = { activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: null, nextPos: 1, sortType: "noteFld", sortBackwards: false, addToCur: true };
  db.run("INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, '{}', ?, ?, '{}')", [
    Math.floor(now / 86_400_000) * 86_400, now, now, JSON.stringify(conf), JSON.stringify({ 1: deckJson(1, "Default", "", now) }), JSON.stringify(DECK_CONF),
  ]);
  return db;
}

const one = (db, query, params = []) => {
  const statement = db.prepare(query);
  try {
    statement.bind(params);
    return statement.step() ? statement.getAsObject() : null;
  } finally {
    statement.free();
  }
};
const all = (db, query, params = []) => {
  const statement = db.prepare(query);
  const rows = [];
  try {
    statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
  } finally {
    statement.free();
  }
  return rows;
};

/**
 * Adds checked cards to a collection's deck (made with its parents if missing), with the note types they use;
 * a card whose guid is already a note there updates that note instead. Returns what it did.
 */
export function addNotes(db, { deck, description, cards, now = Date.now() }) {
  const parts = deckParts(deck);
  const name = parts.join("::");
  const col = one(db, "SELECT conf, models, decks FROM col");
  if (!col.models) throw new Error("This collection keeps its note types in tables (a newer schema): only legacy packages (collection.anki2 or .anki21) can be added to.");
  const models = JSON.parse(col.models);
  const decks = JSON.parse(col.decks);
  const conf = JSON.parse(col.conf);
  const byName = new Map(Object.values(decks).map((d) => [d.name, d]));
  let did;
  for (let i = 1; i <= parts.length; i++) {
    const partial = parts.slice(0, i).join("::");
    let existing = byName.get(partial);
    if (!existing) {
      let id = deckId(partial);
      while (decks[id]) id++;
      existing = decks[id] = deckJson(id, partial, i === parts.length ? description : "", now);
      byName.set(partial, existing);
    } else if (i === parts.length && description !== undefined) {
      existing.desc = description;
      existing.mod = Math.floor(now / 1000);
    }
    did = existing.id;
  }

  const existing = new Map(all(db, "SELECT id, guid, mid FROM notes").map((n) => [n.guid, n]));
  const seen = new Map();
  let nextId = Math.max(now, (one(db, "SELECT max(id) AS m FROM notes").m ?? 0) + 1, (one(db, "SELECT max(id) AS m FROM cards").m ?? 0) + 1);
  let due = (one(db, "SELECT max(due) AS m FROM cards WHERE type = 0").m ?? 0) + 1;
  const mod = Math.floor(now / 1000);
  let added = 0;
  let updated = 0;
  let cardCount = 0;
  for (const [index, card] of cards.entries()) {
    const mid = noteTypeId(card.type);
    if (!models[mid]) models[mid] = noteTypeJson(card.type, did, now);
    const guid = card.guid ?? guidFor(name, card.fields[0]);
    if (seen.has(guid)) throw new Error(`Cards ${seen.get(guid) + 1} and ${index + 1} are the same note (same deck and first field, or same guid): merge them, or change one's first field.`);
    seen.set(guid, index);
    const tags = card.tags.length ? ` ${card.tags.join(" ")} ` : "";
    const row = [mid, mod, tags, card.fields.join("\x1f"), stripHtmlMedia(card.fields[0]), checksum(card.fields[0])];
    const old = existing.get(guid);
    let nid;
    if (old) {
      if (old.mid !== mid) throw new Error(`Card ${index + 1} would update a note of another note type (guid ${guid}): give it a different first field, or keep its note type.`);
      nid = old.id;
      db.run("UPDATE notes SET mid = ?, mod = ?, usn = -1, tags = ?, flds = ?, sfld = ?, csum = ? WHERE id = ?", [...row, nid]);
      const ords = new Set(card.ords);
      for (const c of all(db, "SELECT id, ord FROM cards WHERE nid = ?", [nid])) {
        if (ords.has(c.ord)) ords.delete(c.ord);
        else db.run("DELETE FROM cards WHERE id = ?", [c.id]); // a cloze deletion that's gone
      }
      for (const ord of ords) db.run("INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')", [nextId++, nid, did, ord, mod, due]);
      if (ords.size) due++;
      updated++;
    } else {
      nid = nextId++;
      db.run("INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')", [nid, guid, ...row]);
      for (const ord of card.ords) db.run("INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')", [nextId++, nid, did, ord, mod, due]);
      due++;
      added++;
    }
    existing.set(guid, { id: nid, guid, mid });
    cardCount += card.ords.length;
  }
  conf.curDeck = did;
  conf.activeDecks = [did];
  conf.nextPos = due;
  conf.curModel = String(noteTypeId(cards[0]?.type ?? "basic"));
  db.run("UPDATE col SET mod = ?, conf = ?, models = ?, decks = ?", [now, JSON.stringify(conf), JSON.stringify(models), JSON.stringify(decks)]);
  return { deck: name, deckId: did, added, updated, cards: cardCount };
}

/** The .apkg's bytes: the collection, the media map and the media files. */
export function pack(db, media) {
  const files = { "collection.anki2": db.export() };
  const map = {};
  media.forEach((file, i) => {
    files[String(i)] = [file.data, { level: /\.(jpe?g|png|gif|webp|mp3|ogg|m4a|mp4|webm|zip)$/i.test(file.name) ? 0 : 6 }];
    map[i] = file.name;
  });
  files.media = strToU8(JSON.stringify(map));
  return zipSync(files, { level: 6 });
}

/** An .apkg opened: its collection (legacy schema), which file it was, and its media. */
export async function openPackage(file) {
  if (!path.isAbsolute(file)) throw new Error(`"${file}" isn't an absolute path.`);
  if (!existsSync(file)) throw new Error(`There's no file at ${file}.`);
  let entries;
  try {
    entries = unzipSync(new Uint8Array(readFileSync(file)));
  } catch {
    throw new Error(`${file} isn't an Anki package (.apkg or .colpkg is a zip file).`);
  }
  // A package for Anki 2.1 brings collection.anki21 next to a placeholder collection.anki2 for older versions;
  // one in the newer format, collection.anki21b (compressed) next to such a placeholder.
  if (entries["collection.anki21b"] && !entries["collection.anki21"]) throw new Error("This package is in Anki's newer compressed format (collection.anki21b), which this server can't read: ask the person to export it again from Anki with \"Support older Anki versions\" ticked.");
  const collection = ["collection.anki21", "collection.anki2"].find((name) => entries[name]);
  if (!collection) throw new Error(`${file} has no Anki collection inside: it isn't an Anki package.`);
  const db = new (await sqlite()).Database(entries[collection]);
  let map = {};
  if (entries.media?.length) {
    try {
      map = JSON.parse(strFromU8(entries.media));
    } catch {
      throw new Error("This package's media list isn't the legacy JSON one: ask the person to export it again from Anki with \"Support older Anki versions\" ticked.");
    }
  }
  const media = Object.entries(map).map(([key, name]) => ({ name, data: entries[key] })).filter((m) => m.data);
  return { db, collection, media };
}

/** Note types and decks of a collection, from the legacy JSON or, in a newer schema, from their tables. */
function schemaOf(db) {
  const col = one(db, "SELECT models, decks FROM col");
  if (col.models) {
    const models = Object.values(JSON.parse(col.models)).map((m) => ({
      id: Number(m.id), name: m.name, kind: m.type === 1 ? "cloze" : "standard",
      fields: [...m.flds].sort((a, b) => a.ord - b.ord).map((f) => f.name),
      templates: [...m.tmpls].sort((a, b) => a.ord - b.ord).map((t) => t.name),
    }));
    const decks = Object.values(JSON.parse(col.decks)).map((d) => ({ id: Number(d.id), name: d.name, description: d.desc ?? "" }));
    return { models, decks };
  }
  const models = all(db, "SELECT id, name FROM notetypes").map((m) => ({
    id: m.id, name: m.name, kind: "standard",
    fields: all(db, "SELECT name FROM fields WHERE ntid = ? ORDER BY ord", [m.id]).map((f) => f.name),
    templates: all(db, "SELECT name FROM templates WHERE ntid = ? ORDER BY ord", [m.id]).map((t) => t.name),
  }));
  for (const m of models) if (m.templates.length === 1 && m.fields.includes("Text") && /cloze/i.test(m.name)) m.kind = "cloze";
  const decks = all(db, "SELECT id, name FROM decks").map((d) => ({ id: d.id, name: String(d.name).replaceAll("\x1f", "::"), description: "" }));
  return { models, decks };
}

/** How a note would be written again with write_deck or add_to_deck, if its note type is one of those shapes. */
function asCard(model, values, tags, guid) {
  const get = (name) => values[model.fields.indexOf(name)] ?? "";
  const extra = model.fields.includes("Extra") ? get("Extra") : model.fields.includes("Back Extra") ? get("Back Extra") : "";
  const base = { guid, ...(tags.length ? { tags } : {}), ...(extra ? { extra } : {}) };
  if (model.kind === "cloze" && model.fields.includes("Text")) return { type: "cloze", text: get("Text"), ...base };
  if (model.fields.includes("Front") && model.fields.includes("Back")) return { type: model.templates.length === 2 ? "basic-reversed" : "basic", front: get("Front"), back: get("Back"), ...base };
  return null;
}

/** An .apkg's decks, note types, media and a page of its notes, as data. */
export async function readDeck(file, { offset = 0, limit = 50, deck } = {}) {
  const { db, collection, media } = await openPackage(file);
  try {
    const { models, decks } = schemaOf(db);
    const deckName = new Map(decks.map((d) => [d.id, d.name]));
    const modelOf = new Map(models.map((m) => [m.id, m]));
    const counts = new Map(all(db, "SELECT did, count(*) AS cards, count(DISTINCT nid) AS notes FROM cards GROUP BY did").map((r) => [r.did, r]));
    let wanted = null;
    if (deck) {
      const name = deckParts(deck).join("::");
      wanted = decks.filter((d) => d.name === name || d.name.startsWith(`${name}::`)).map((d) => d.id);
      if (!wanted.length) throw new Error(`There's no deck "${name}" in this package: its decks are ${decks.map((d) => `"${d.name}"`).join(", ")}.`);
    }
    const filter = wanted ? `WHERE id IN (SELECT nid FROM cards WHERE did IN (${wanted.join(",")}))` : "";
    const total = one(db, `SELECT count(*) AS n FROM notes ${filter}`).n;
    const notes = all(db, `SELECT id, guid, mid, tags, flds FROM notes ${filter} ORDER BY id LIMIT ? OFFSET ?`, [limit, offset]).map((n) => {
      const model = modelOf.get(n.mid) ?? { id: n.mid, name: "?", kind: "standard", fields: [], templates: [] };
      const values = String(n.flds).split("\x1f");
      const tags = String(n.tags).trim().split(/\s+/).filter(Boolean);
      const cards = all(db, "SELECT did, ord, type, queue, ivl, reps FROM cards WHERE nid = ? ORDER BY ord", [n.id]);
      const fields = Object.fromEntries(values.map((v, i) => [model.fields[i] ?? `Field ${i + 1}`, v]));
      return {
        guid: n.guid, noteType: model.name, deck: deckName.get(cards[0]?.did) ?? null, fields, tags,
        cards: cards.length, studied: cards.some((c) => c.type !== 0 || c.reps > 0),
        asCard: asCard(model, values, tags, n.guid),
      };
    });
    return {
      file, format: `${collection} (Anki's legacy collection)`,
      decks: decks.filter((d) => d.id !== 1 || counts.has(1)).map((d) => ({ ...d, notes: counts.get(d.id)?.notes ?? 0, cards: counts.get(d.id)?.cards ?? 0 })),
      noteTypes: models.map(({ id, name, kind, fields, templates }) => ({ id, name, kind, fields, templates })),
      media: media.map((m) => m.name),
      totalNotes: total, offset, limit, notes,
      next: offset + notes.length < total ? offset + notes.length : null,
    };
  } finally {
    db.close();
  }
}

/** The deck that holds most cards in a collection: where add_to_deck adds, when it isn't told. */
export function mainDeck(db) {
  const { decks } = schemaOf(db);
  const top = one(db, "SELECT did, count(*) AS n FROM cards GROUP BY did ORDER BY n DESC LIMIT 1");
  return decks.find((d) => d.id === top?.did)?.name ?? decks.find((d) => d.id !== 1)?.name ?? null;
}

/** Checks the output path: absolute, .apkg, its folder there, and not over a file unless told. */
export function checkOutput(file, overwrite) {
  if (!path.isAbsolute(file)) throw new Error(`"${file}" isn't an absolute path: give the full path of the .apkg to write.`);
  if (path.extname(file).toLowerCase() !== ".apkg") throw new Error(`"${file}" should end in .apkg, the extension Anki imports.`);
  if (!existsSync(path.dirname(file))) throw new Error(`The folder ${path.dirname(file)} doesn't exist.`);
  if (existsSync(file) && !overwrite) throw new Error(`${file} already exists: write to another name, or, with the person's yes, call again with overwrite: true.`);
}

/** Every media file referenced by the cards is there; returns the names given but not referenced. */
function checkMediaReferences(cards, available) {
  const missing = [];
  const referenced = new Set();
  for (const [i, card] of cards.entries()) {
    for (const name of card.media) {
      referenced.add(name);
      if (!available.has(name)) missing.push(`card ${i + 1} references "${name}"`);
    }
  }
  if (missing.length) throw new Error(`Missing media: ${missing.join("; ")}. Pass each file's absolute path in media, and reference it in the field by its file name only (<img src="name.png"> or [sound:name.mp3]).`);
  return referenced;
}

/** Writes a new deck as an .apkg. */
export async function writeDeck({ file, deck, description, noteType = "basic", cards, tags = [], media = [], overwrite = false, now = Date.now() }) {
  checkOutput(file, overwrite);
  if (!cards?.length) throw new Error("A deck needs at least one card.");
  if (cards.length > LIMITS.cards) throw new Error(`At most ${LIMITS.cards} cards per call.`);
  const checked = cards.map((card, i) => checkCard({ ...card, tags: [...tags, ...(card.tags ?? [])] }, i, noteType));
  const files = readMedia(media);
  const referenced = checkMediaReferences(checked, new Set(files.map((f) => f.name)));
  const db = await newCollection(now);
  try {
    const result = addNotes(db, { deck, description, cards: checked, now });
    const bytes = pack(db, files);
    writeFileSync(file, bytes);
    return { file, ...result, media: files.length, unusedMedia: files.map((f) => f.name).filter((n) => !referenced.has(n)), bytes: bytes.length };
  } finally {
    db.close();
  }
}

/** Writes a new .apkg with an existing one's notes plus new or updated cards, keeping its ids, note types and media. */
export async function addToDeck({ source, file, deck, description, noteType = "basic", cards, tags = [], media = [], overwrite = false, now = Date.now() }) {
  const { db, media: oldMedia } = await openPackage(source);
  try {
    checkOutput(file, overwrite);
    if (!cards?.length) throw new Error("Give at least one card to add.");
    if (cards.length > LIMITS.cards) throw new Error(`At most ${LIMITS.cards} cards per call.`);
    const target = deck ?? mainDeck(db);
    if (!target) throw new Error("The package has no deck with cards: say which deck to add to.");
    const checked = cards.map((card, i) => checkCard({ ...card, tags: [...tags, ...(card.tags ?? [])] }, i, noteType));
    const files = readMedia(media);
    const mediaFiles = [...oldMedia];
    for (const f of files) {
      const same = mediaFiles.find((m) => m.name === f.name);
      if (!same) mediaFiles.push(f);
      else if (Buffer.compare(Buffer.from(same.data), Buffer.from(f.data)) !== 0) throw new Error(`The package already has a different media file called "${f.name}": rename the new one.`);
    }
    const referenced = checkMediaReferences(checked, new Set(mediaFiles.map((f) => f.name)));
    const result = addNotes(db, { deck: target, description, cards: checked, now });
    const bytes = pack(db, mediaFiles);
    writeFileSync(file, bytes);
    return { file, source, ...result, media: mediaFiles.length, unusedMedia: files.map((f) => f.name).filter((n) => !referenced.has(n)), bytes: bytes.length };
  } finally {
    db.close();
  }
}
