import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { countQuestions, parseName, plainText, readMoodleXml, typeNotes } from "../src/asker/questions.js";
import { run } from "./fake.js";

const xml = (name: string) => readFileSync(run(name, `${name}-moodle.xml`), "utf8");

/** Asker's own count per concept, problem or code file, from the tables it prints. */
function askerCounts(name: string): Record<string, number> {
  const { stdout } = JSON.parse(readFileSync(run(name, "run.json"), "utf8")) as { stdout: string };
  const counts: Record<string, number> = {};
  let column = -1;
  for (const line of stdout.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.includes("Questions")) {
      column = cells.indexOf("Questions");
      continue;
    }
    const [group = ""] = cells;
    if (column < 0 || /^(Excluded questions|TOTAL\b|\d+ concept\/s)/.test(group) || !/^\d+$/.test(cells[column] ?? "")) continue;
    counts[group] = Number(cells[column]);
  }
  return counts;
}

describe("question names", () => {
  it("tells where each comes from, whatever Asker's naming", () => {
    assert.deepEqual(parseName("AC/DC-4-d2true"), { group: "AC/DC", number: 4, kind: "definitions", template: "d2true" });
    assert.deepEqual(parseName("AC/DC-22t5table-$attribute$value"), { group: "AC/DC", number: 22, kind: "table-rows", template: "t5table" });
    assert.deepEqual(parseName("AC/DC-9-f1short4-$members"), { group: "AC/DC", number: 9, kind: "one-field-tables", template: "f1short" });
    assert.deepEqual(parseName("AC/DC-10-f1name-misspelled4-$members"), { group: "AC/DC", number: 10, kind: "one-field-tables", template: "f1name-misspelled" });
    assert.deepEqual(parseName("yoda-51-b1ddmatch4x4-$attribute$value"), { group: "yoda", number: 51, kind: "table-matching", template: "b1ddmatch4x4" });
    assert.deepEqual(parseName("COVID-19-3-s1sequence-$dates"), { group: "COVID-19", number: 3, kind: "sequences", template: "s1sequence" });
    assert.deepEqual(parseName("John Lennon-2-i1misspelling"), { group: "John Lennon", number: 2, kind: "files", template: "i1misspelling" });
    assert.deepEqual(parseName("mathematical1-3-03pa2-choice-none"), { group: "mathematical1", number: 3, kind: "problem-answers", template: "03pa2-choice-none" });
    assert.deepEqual(parseName("first2-30-07ps3short-ok"), { group: "first2", number: 30, kind: "problem-steps", template: "07ps3short-ok" });
    assert.deepEqual(parseName("string.py-7-code1syntaxerror"), { group: "string.py", number: 7, kind: "code", template: "code1syntaxerror" });
    assert.deepEqual(parseName("my own question"), { group: "my own question", number: 0, kind: "other", template: "" });
  });
});

describe("plain text", () => {
  it("keeps lines, drops tags and names the media", () => {
    assert.equal(plainText("Definition of <b>AC/DC</b>:<br/> <i>Rock band</i>"), "Definition of AC/DC:\n Rock band");
    assert.equal(plainText('<img src="@@PLUGINFILE@@/dot.png" alt="image"> Who?'), "[image: dot.png] Who?");
    assert.equal(plainText('<audio controls><source src="@@PLUGINFILE@@/a.mp3">No audio.</audio><br/>Which?'), "[audio: a.mp3]\nWhich?");
    assert.equal(plainText("<pre> 1: x = 1\n 2: print(x)</pre>"), "1: x = 1\n 2: print(x)");
    assert.equal(plainText("a &lt; b &amp;&amp; c &#62; d"), "a < b && c > d");
  });
});

describe("reading Asker's Moodle XML", () => {
  for (const name of ["devices", "protocols", "equations", "python", "painters"]) {
    it(`groups ${name}'s questions as Asker counts them, every one with its kind`, () => {
      const { questions } = readMoodleXml(xml(name));
      assert.ok(questions.length > 0);
      assert.deepEqual(questions.filter((q) => q.kind === "other").map((q) => q.name), []);
      const { groups } = countQuestions(questions);
      const ours = Object.fromEntries(groups.map((g) => [g.group, g.total]));
      const asker = Object.fromEntries(Object.entries(askerCounts(name)).filter(([, total]) => total > 0));
      assert.ok(Object.keys(asker).length > 0, `${name}: Asker's table`);
      assert.deepEqual(ours, asker);
    });
  }

  it("gives each type's answers", () => {
    const questions = [...readMoodleXml(xml("devices")).questions, ...readMoodleXml(xml("equations")).questions];
    const of = (type: string) => questions.find((q) => q.type === type)!;
    assert.equal(typeof of("truefalse").correct, "boolean");
    assert.ok(of("multichoice").options!.filter((o) => o.correct).length >= 1);
    assert.ok(of("shortanswer").accepted!.length >= 1);
    assert.ok(of("matching").pairs!.length >= 2);
    assert.ok(of("ordering").order!.length >= 2);
    assert.ok(of("ddmatch").pairs!.length >= 2);
  });

  it("names the files a question embeds", () => {
    const withFiles = readMoodleXml(xml("painters")).questions.filter((q) => q.files);
    assert.ok(withFiles.length > 0);
    assert.ok(withFiles.every((q) => q.files!.includes("dot.png")));
    assert.match(withFiles[0]!.text, /\[image: dot\.png\]/);
  });

  it("warns about types a Moodle may not take", () => {
    const { all } = countQuestions(readMoodleXml(xml("devices")).questions);
    const notes = typeNotes(all).join("\n");
    assert.match(notes, /ddmatch/);
  });

  it("refuses what isn't Moodle XML", () => {
    assert.throws(() => readMoodleXml("::q1:: Is it? {T}"), /isn't a Moodle XML file/);
  });
});
