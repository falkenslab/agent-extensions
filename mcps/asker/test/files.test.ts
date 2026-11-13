import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { GIFT_DDMATCH_WARNING, giftNames, parseCheck, parseRun, removeFromGift, removeFromMoodleXml, repairAskerGift, repairAskerXml, setMoodleXmlCategory } from "../src/asker/files.js";
import { readMoodleXml } from "../src/asker/questions.js";
import { run } from "./fake.js";

const read = (name: string, file: string) => readFileSync(run(name, file), "utf8");
const captured = (name: string, kind: string) => JSON.parse(read(name, `${kind}.json`)) as { code: number; stdout: string; stderr: string };

describe("leaving questions out of Moodle XML", () => {
  const xml = read("devices", "devices-moodle.xml");
  const questions = readMoodleXml(xml).questions;

  it("changes nothing when nothing is selected", () => {
    const removal = removeFromMoodleXml(xml, {});
    assert.equal(removal.text, xml);
    assert.equal(removal.kept.length, questions.length);
  });

  it("leaves out whole questions by name and by type, and nothing else", () => {
    const names = [questions[0]!.name, questions[5]!.name];
    const ddmatch = questions.filter((q) => q.type === "ddmatch").length;
    assert.ok(ddmatch > 0);
    const removal = removeFromMoodleXml(xml, { names, types: ["ddmatch"] });
    assert.equal(removal.removed.length, 2 + ddmatch);
    const left = readMoodleXml(removal.text).questions;
    assert.equal(left.length, questions.length - 2 - ddmatch);
    assert.deepEqual(left, questions.filter((q) => !names.includes(q.name) && q.type !== "ddmatch"));
  });
});

describe("leaving questions out of GIFT", () => {
  const gift = read("protocols", "protocols-gift.txt");

  it("changes nothing when nothing is selected", () => {
    assert.equal(removeFromGift(gift, {}).text, gift);
  });

  it("leaves out by name and by type, keeping the headers and the rest", () => {
    const names = giftNames(gift);
    const removal = removeFromGift(gift, { names: [names[0]!], types: ["truefalse"] });
    assert.ok(removal.removed.includes(names[0]!));
    assert.deepEqual(giftNames(removal.text), removal.kept);
    assert.equal(removal.kept.length + removal.removed.length, names.length);
    assert.match(removal.text, /\/\/ Concept name: HTTP/);
    assert.doesNotMatch(removal.text, /\{TRUE####\}|\{FALSE####\}/);
  });
});

describe("Asker's GIFT and drag-and-drop matching", () => {
  it("is broken by Asker around ddmatch questions, and repaired: every other question is there, whole", () => {
    for (const name of ["devices", "equations"]) {
      const gift = read(name, `${name}-gift.txt`);
      const questions = readMoodleXml(read(name, `${name}-moodle.xml`)).questions;
      const ddmatch = questions.filter((q) => q.type === "ddmatch").map((q) => q.name);
      if (!ddmatch.length) continue;
      assert.ok(gift.includes(GIFT_DDMATCH_WARNING), `${name}: Asker's warning`);
      const repaired = repairAskerGift(gift, ddmatch);
      assert.doesNotMatch(repaired.text, /WARNING/);
      assert.deepEqual(new Set(giftNames(repaired.text)), new Set(questions.filter((q) => q.type !== "ddmatch").map((q) => q.name)));
    }
  });
});

describe("the category in Moodle XML", () => {
  it("goes first, once, under the course, escaped", () => {
    const xml = read("protocols", "protocols-moodle.xml");
    const once = setMoodleXmlCategory(xml, "Unit 1/Networks & <protocols>");
    const twice = setMoodleXmlCategory(once, "Unit 2");
    assert.equal(readMoodleXml(once).category, "$course$/Unit 1/Networks & <protocols>");
    assert.equal(readMoodleXml(twice).category, "$course$/Unit 2");
    assert.equal((twice.match(/type="category"/g) ?? []).length, 1);
    assert.equal(readMoodleXml(twice).questions.length, readMoodleXml(xml).questions.length);
  });
});

describe("Asker's messages", () => {
  it("reads asker check's errors with their lines", () => {
    const { stdout, stderr } = captured("syntax", "check");
    const result = parseCheck(`${stdout}\n${stderr}`);
    assert.equal(result.ok, false);
    assert.equal(result.total, 2);
    assert.deepEqual(result.errors.map((e) => e.line), [6, 7]);
    assert.match(result.errors[0]!.message, /Write 4 spaces before %def/);
    assert.match(result.errors[0]!.source, /%deff/);
    assert.equal(parseCheck("Syntax OK!\n").ok, true);
  });

  it("reads the errors Asker gives loading, joined when they go on", () => {
    const syntax = captured("syntax", "run");
    const { errors } = parseRun(`${syntax.stdout}\n${syntax.stderr}`);
    assert.equal(errors.length, 1);
    assert.match(errors[0]!, /Can't load file.*Inconsistent indentation/);
    const rows = captured("rows", "run");
    assert.match(parseRun(`${rows.stdout}\n${rows.stderr}`).errors[0]!, /columns size != table\.fields\.size/);
    assert.deepEqual(parseRun(captured("devices", "run").stdout), { errors: [], warnings: [], excluded: 0 });
  });
});

describe("Asker's Moodle XML with unescaped text", () => {
  it("is escaped where it's plain text, and read with the same words", () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n  <question type="shortanswer">\n    <name>\n      <text>sql-1-d3hidden</text>\n    </name>\n    <questiontext format="html">\n      <text><![CDATA[Load <b>the</b> data]]></text>\n    </questiontext>\n    <answer fraction="100" format="html">\n      <text>mysql -u root < data.sql && echo ok</text>\n    </answer>\n  </question>\n</quiz>\n';
    assert.throws(() => readMoodleXml(xml));
    const { text, repaired } = repairAskerXml(xml);
    assert.equal(repaired, 1);
    const [question] = readMoodleXml(text).questions;
    assert.deepEqual(question!.accepted, ["mysql -u root < data.sql && echo ok"]);
    assert.equal(question!.text, "Load the data");
    assert.deepEqual(repairAskerXml(text), { text, repaired: 0, ordering: 0 });
  });
});

describe("Asker's ordering questions", () => {
  it("get the setting Moodle needs to import them, once", () => {
    const xml = readFileSync(run("devices", "devices-moodle.xml"), "utf8");
    const orderings = (xml.match(/<question type="ordering">/g) ?? []).length;
    assert.ok(orderings > 0);
    const { text, ordering } = repairAskerXml(xml);
    assert.equal(ordering, orderings);
    for (const block of text.match(/<question type="ordering">[^]*?<\/question>/g) ?? []) assert.match(block, /<shownumcorrect\/>\s*<answer/);
    assert.equal(repairAskerXml(text).ordering, 0);
    assert.deepEqual(readMoodleXml(text).questions, readMoodleXml(xml).questions);
  });
});

describe("GIFT names ending in a colon", () => {
  it("keep the colon", () => {
    const gift = "::Reino Monera-9-f1short4-$se caracterizan por ser:::[html]Which?\n{\n  =x\n}\n\n::plain-1-d2true::[html]Is it?\n{TRUE####}\n";
    assert.deepEqual(giftNames(gift), ["Reino Monera-9-f1short4-$se caracterizan por ser:", "plain-1-d2true"]);
    assert.deepEqual(removeFromGift(gift, { names: ["Reino Monera-9-f1short4-$se caracterizan por ser:"] }).kept, ["plain-1-d2true"]);
  });
});
