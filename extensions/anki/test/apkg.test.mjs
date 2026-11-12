import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { addToDeck, deckId, guidFor, noteTypeId, readDeck, sqlite, writeDeck } from "../src/apkg.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "anki-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

/** The package's files, and its collection opened with sql.js. */
async function open(file) {
  const entries = unzipSync(new Uint8Array(readFileSync(file)));
  const db = new (await sqlite()).Database(entries["collection.anki2"]);
  const rows = (query) => {
    const [result] = db.exec(query);
    return result ? result.values.map((v) => Object.fromEntries(result.columns.map((c, i) => [c, v[i]]))) : [];
  };
  return { entries, db, rows };
}

const sha1int = (text) => parseInt(createHash("sha1").update(text).digest("hex").slice(0, 8), 16);

test("writes a basic deck that reads back, with a valid legacy collection", async () => {
  const file = path.join(dir, "capitals.apkg");
  const result = await writeDeck({
    file,
    deck: "Geography::Capitals",
    description: "European capitals",
    tags: ["geo"],
    cards: [
      { front: "Capital of <b>France</b>?", back: "Paris", tags: ["europe"] },
      { front: "Capital of Spain?", back: "Madrid", extra: "Since 1561" },
      { type: "basic-reversed", front: "Germany", back: "Berlin" },
    ],
  });
  assert.equal(result.added, 3);
  assert.equal(result.cards, 4);

  const { entries, rows, db } = await open(file);
  assert.deepEqual(Object.keys(entries).sort(), ["collection.anki2", "media"]);
  assert.equal(strFromU8(entries.media), "{}");
  const [col] = rows("SELECT * FROM col");
  assert.equal(col.ver, 11);
  const models = JSON.parse(col.models);
  const decks = JSON.parse(col.decks);
  assert.deepEqual(Object.values(models).map((m) => m.name).sort(), ["Basic (with Extra)", "Basic and reversed (with Extra)"]);
  assert.ok(models[noteTypeId("basic")]);
  assert.deepEqual(Object.values(decks).map((d) => d.name).sort(), ["Default", "Geography", "Geography::Capitals"]);
  const did = deckId("Geography::Capitals");
  assert.equal(decks[did].desc, "European capitals");
  assert.ok(JSON.parse(col.dconf)["1"]);
  assert.equal(JSON.parse(col.conf).curDeck, did);

  const notes = rows("SELECT * FROM notes ORDER BY id");
  assert.equal(notes.length, 3);
  assert.equal(notes[0].flds, "Capital of <b>France</b>?\x1fParis\x1f");
  assert.equal(notes[0].sfld, "Capital of France?");
  assert.equal(notes[0].csum, sha1int("Capital of France?"));
  assert.equal(notes[0].tags, " geo europe ");
  assert.equal(notes[0].guid, guidFor("Geography::Capitals", "Capital of <b>France</b>?"));
  assert.equal(notes[1].flds.split("\x1f")[2], "Since 1561");

  const cards = rows("SELECT * FROM cards ORDER BY id");
  assert.equal(cards.length, 4);
  assert.ok(cards.every((c) => c.did === did && c.type === 0 && c.queue === 0));
  assert.deepEqual(cards.map((c) => c.due), [1, 2, 3, 3]);
  assert.deepEqual(rows("SELECT ord FROM cards WHERE nid = " + notes[2].id + " ORDER BY ord").map((c) => c.ord), [0, 1]);
  assert.equal(rows("PRAGMA integrity_check")[0].integrity_check, "ok");
  db.close();

  const read = await readDeck(file);
  assert.equal(read.totalNotes, 3);
  assert.equal(read.next, null);
  assert.deepEqual(read.notes[0].fields, { Front: "Capital of <b>France</b>?", Back: "Paris", Extra: "" });
  assert.deepEqual(read.notes[2].asCard, { type: "basic-reversed", front: "Germany", back: "Berlin", guid: read.notes[2].guid, tags: ["geo"] });
  assert.equal(read.decks.find((d) => d.name === "Geography::Capitals").cards, 4);
  const page = await readDeck(file, { offset: 1, limit: 1 });
  assert.equal(page.notes.length, 1);
  assert.equal(page.next, 2);
});

test("writes a deck with media and cloze cards", async () => {
  const image = path.join(dir, "cell.png");
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b20000000049454e44ae426082", "hex");
  writeFileSync(image, png);
  const audio = path.join(dir, "word.mp3");
  writeFileSync(audio, Buffer.from([0xff, 0xfb, 0x90, 0x00]));
  const file = path.join(dir, "biology.apkg");
  const result = await writeDeck({
    file,
    deck: "Biology",
    noteType: "cloze",
    media: [image, audio],
    cards: [
      { text: "The {{c1::mitochondria}} is the {{c2::powerhouse::what?}} of the cell", extra: "<img src=\"cell.png\">" },
      { type: "basic", front: "Say it\n[sound:word.mp3]", back: "Cell" },
    ],
  });
  assert.equal(result.cards, 3);
  assert.deepEqual(result.unusedMedia, []);

  const { entries, rows, db } = await open(file);
  assert.deepEqual(JSON.parse(strFromU8(entries.media)), { 0: "cell.png", 1: "word.mp3" });
  assert.deepEqual(Buffer.from(entries["0"]), png);
  const models = JSON.parse(rows("SELECT models FROM col")[0].models);
  const cloze = models[noteTypeId("cloze")];
  assert.equal(cloze.type, 1);
  assert.deepEqual(cloze.flds.map((f) => f.name), ["Text", "Back Extra"]);
  const note = rows("SELECT * FROM notes WHERE mid = " + noteTypeId("cloze"))[0];
  assert.deepEqual(rows("SELECT ord FROM cards WHERE nid = " + note.id + " ORDER BY ord").map((c) => c.ord), [0, 1]);
  const basic = rows("SELECT flds FROM notes WHERE mid = " + noteTypeId("basic"))[0];
  assert.equal(basic.flds.split("\x1f")[0], "Say it<br>[sound:word.mp3]");
  db.close();

  const read = await readDeck(file);
  assert.deepEqual(read.media, ["cell.png", "word.mp3"]);
  assert.equal(read.notes[0].asCard.type, "cloze");
});

test("the same deck exported again keeps its ids, so Anki updates instead of duplicating", async () => {
  const input = { deck: "Vocab", cards: [{ front: "hola", back: "hello" }] };
  await writeDeck({ file: path.join(dir, "v1.apkg"), ...input, now: 1_700_000_000_000 });
  await writeDeck({ file: path.join(dir, "v2.apkg"), ...input, cards: [{ front: "hola", back: "hi" }], now: 1_700_000_100_000 });
  const a = (await readDeck(path.join(dir, "v1.apkg"))).notes[0];
  const b = (await readDeck(path.join(dir, "v2.apkg"))).notes[0];
  assert.equal(a.guid, b.guid);
  const one = await open(path.join(dir, "v1.apkg"));
  const two = await open(path.join(dir, "v2.apkg"));
  assert.ok(two.rows("SELECT mod FROM notes")[0].mod > one.rows("SELECT mod FROM notes")[0].mod);
  assert.deepEqual(Object.keys(JSON.parse(one.rows("SELECT decks FROM col")[0].decks)), Object.keys(JSON.parse(two.rows("SELECT decks FROM col")[0].decks)));
});

test("refuses what Anki wouldn't take or what would lose work", async () => {
  const file = path.join(dir, "bad.apkg");
  await assert.rejects(writeDeck({ file, deck: "X", noteType: "cloze", cards: [{ text: "no deletion" }] }), /no cloze deletion/);
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "a" }] }), /no back/);
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "<script>alert(1)</script>", back: "b" }] }), /<script> isn't allowed/);
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "<b onclick=\"x()\">a</b>", back: "b" }] }), /event handler/);
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "x<y", back: "b" }] }), /&lt;/);
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "<img src=\"missing.png\">", back: "b" }] }), /Missing media/);
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "a", back: "b" }, { front: "a", back: "c" }] }), /same note/);
  await assert.rejects(writeDeck({ file, deck: "A::::B", cards: [{ front: "a", back: "b" }] }), /isn't a deck name/);
  await assert.rejects(writeDeck({ file: "relative.apkg", deck: "X", cards: [{ front: "a", back: "b" }] }), /absolute/);
  assert.equal(existsSync(file), false);
  await writeDeck({ file, deck: "X", cards: [{ front: "a < b", back: "b" }] });
  await assert.rejects(writeDeck({ file, deck: "X", cards: [{ front: "a", back: "b" }] }), /already exists/);
  await writeDeck({ file, deck: "X", cards: [{ front: "a", back: "b" }], overwrite: true });
});

test("adds to an existing package, keeping its notes and updating a changed one", async () => {
  const source = path.join(dir, "base.apkg");
  const image = path.join(dir, "map.png");
  writeFileSync(image, Buffer.from("not really a png"));
  await writeDeck({ file: source, deck: "Rivers", media: [image], cards: [{ front: "Longest river in Spain?", back: "Tajo <img src=\"map.png\">" }, { front: "Longest river?", back: "Nile" }] });
  const before = await readDeck(source);
  const file = path.join(dir, "base-2.apkg");
  const result = await addToDeck({ source, file, cards: [{ front: "Longest river?", back: "Nile (or Amazon)" }, { front: "Longest river in France?", back: "Loire" }] });
  assert.equal(result.deck, "Rivers");
  assert.equal(result.added, 1);
  assert.equal(result.updated, 1);
  const read = await readDeck(file);
  assert.equal(read.totalNotes, 3);
  assert.deepEqual(read.media, ["map.png"]);
  const nile = read.notes.find((n) => n.fields.Front === "Longest river?");
  assert.equal(nile.fields.Back, "Nile (or Amazon)");
  assert.equal(nile.guid, before.notes[1].guid);
  const { rows } = await open(file);
  assert.equal(rows("SELECT count(*) AS n FROM cards")[0].n, 3);
  assert.deepEqual(rows("SELECT due FROM cards ORDER BY due").map((c) => c.due), [1, 2, 3]);
  // the source is untouched, and isn't overwritten without overwrite
  assert.equal((await readDeck(source)).totalNotes, 2);
  await assert.rejects(addToDeck({ source, file: source, cards: [{ front: "x", back: "y" }] }), /already exists/);
});
