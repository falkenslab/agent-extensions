// The tools through MCP, with a fake asker that answers as the real one did (test/fake.ts).
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { giftNames } from "../src/asker/files.js";
import { readMoodleXml } from "../src/asker/questions.js";
import { useRunner, type Runner } from "../src/asker/run.js";
import { forgetAsker } from "../src/requirements.js";
import { call, connect } from "./connect.js";
import { fakeAsker, input, run, type FakeCall } from "./fake.js";

let previous: Runner;
let calls: FakeCall[];
let out: string;

before(() => {
  const fake = fakeAsker();
  calls = fake.calls;
  previous = useRunner(fake.runner);
  forgetAsker(true);
  out = mkdtempSync(path.join(tmpdir(), "asker-mcp-test-"));
});

after(() => {
  useRunner(previous);
  forgetAsker(false);
  rmSync(out, { recursive: true, force: true });
});

interface Result {
  input: string;
  ok: boolean;
  files: { moodle?: string; gift?: string; doc?: string };
  counts?: { total: number; byType: Record<string, number> };
  groups?: { group: string; total: number }[];
  errors: string[];
  notes: string[];
}

describe("asker_input_reference", () => {
  it("gives the language, or some topics of it", async () => {
    const client = await connect();
    const all = await call<{ text: string }>(client, "asker_input_reference");
    for (const keyword of ["%map", "%concept", "%table", "%template", "%problem", "%code", "type: 'file'"]) assert.ok(all.text.includes(keyword), keyword);
    const some = await call<{ text: string }>(client, "asker_input_reference", { topics: ["tables"] });
    assert.match(some.text, /^# Asker input: tables/);
    assert.doesNotMatch(some.text, /%problem/);
  });
});

describe("check_input", () => {
  it("gives asker check's errors with their lines, the trial run's, and the hints", async () => {
    calls.length = 0;
    const result = await call<{ ok: boolean; syntax: { errors: { line: number }[] }; errors: string[]; explained: string[]; hints: { line?: number; message: string }[]; wouldGenerate?: unknown }>(await connect(), "check_input", { path: input("broken-syntax", "syntax.haml") });
    assert.equal(result.ok, false);
    assert.deepEqual(result.syntax.errors.map((e) => e.line), [6, 7]);
    assert.match(result.errors[0]!, /Inconsistent indentation/);
    assert.match(result.explained[0]!, /Indentation/);
    assert.deepEqual(result.hints.map((h) => h.line), [7]);
    assert.equal(result.wouldGenerate, undefined);
    assert.deepEqual(calls.map((c) => c.args[0]), ["check", input("broken-syntax", "syntax.haml")]);
  });

  it("gives the errors Asker finds only when loading", async () => {
    const result = await call<{ ok: boolean; errors: string[] }>(await connect(), "check_input", { path: input("broken-rows", "rows.haml") });
    assert.equal(result.ok, false);
    assert.match(result.errors[0]!, /columns size/);
  });

  it("says what a good input would make, and what else Asker reads", async () => {
    calls.length = 0;
    const result = await call<{ ok: boolean; wouldGenerate: { total: number; groups: { group: string }[] }; alsoRead: string[] }>(await connect(), "check_input", { path: input("networks", "devices.haml") });
    assert.equal(result.ok, true);
    assert.deepEqual(result.wouldGenerate.groups.map((g) => g.group), ["router", "switch", "hub", "firewall"]);
    const xml = readMoodleXml(readFileSync(run("devices", "devices-moodle.xml"), "utf8"));
    assert.equal(result.wouldGenerate.total, xml.questions.filter((q) => q.type !== "ddmatch").length);
    assert.deepEqual(result.alsoRead, ["protocols.xml"]);
    assert.match(calls.at(-1)!.ini!, /^internet = no$/m);
  });

  it("says when a file next to the input would stop Asker, and doesn't run it", async () => {
    const folder = path.join(out, "foreign");
    mkdirSync(folder, { recursive: true });
    copyFileSync(input("networks", "protocols.xml"), path.join(folder, "protocols.xml"));
    writeFileSync(path.join(folder, "protocols-moodle.xml"), "<?xml version=\"1.0\"?>\n<quiz></quiz>\n");
    calls.length = 0;
    const result = await call<{ ok: boolean; errors: string[] }>(await connect(), "check_input", { path: path.join(folder, "protocols.xml") });
    assert.equal(result.ok, false);
    assert.match(result.errors[0]!, /protocols-moodle.xml.*Move it out/);
    assert.equal(calls.length, 0);
  });

  it("refuses a path that isn't an input", async () => {
    await assert.rejects(call(await connect(), "check_input", { path: "devices.haml" }), /absolute path/);
    await assert.rejects(call(await connect(), "check_input", { path: input("code", "files", "greet.py") }), /\.haml and \.xml/);
  });
});

describe("generate_questions", () => {
  it("writes Moodle XML with the category and without drag-and-drop matching, a repaired GIFT, and the review sheet", async () => {
    calls.length = 0;
    const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", {
      inputs: [input("networks", "devices.haml")],
      outputDir: path.join(out, "devices"),
      formats: ["moodle", "gift", "doc"],
      category: "Unit 1/Networks",
      exclude: ["misspelled"],
    });
    const [result] = results;
    assert.ok(result?.ok);
    for (const file of Object.values(result.files)) assert.ok(existsSync(file!), file);
    const xml = readMoodleXml(readFileSync(result.files.moodle!, "utf8"));
    assert.equal(xml.category, "$course$/Unit 1/Networks");
    assert.equal(xml.questions.filter((q) => q.type === "ddmatch").length, 0);
    assert.equal(result.counts!.total, xml.questions.length);
    assert.deepEqual(new Set(giftNames(readFileSync(result.files.gift!, "utf8"))), new Set(xml.questions.map((q) => q.name)));
    assert.match(result.notes.join("\n"), /drag-and-drop matching \(ddmatch\) questions were left out/);
    const ini = calls.at(-1)!.ini!;
    assert.match(ini, /^exclude = "misspelled, ddmatch"$/m);
    assert.match(ini, /^category = "Unit 1\/Networks"$/m);
    assert.match(ini, /^doc = yes$/m);
  });

  it("keeps drag-and-drop matching when asked, and says GIFT can't hold it", async () => {
    const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", {
      inputs: [input("maths", "equations.haml")],
      outputDir: path.join(out, "equations"),
      formats: ["moodle", "gift"],
      ddmatch: true,
    });
    const [result] = results;
    assert.ok(result!.counts!.byType.ddmatch! > 0);
    assert.match(result!.notes.join("\n"), /GIFT can't hold them/);
    assert.match(result!.notes.join("\n"), /ddmatch.*plugin/);
  });

  it("writes only Moodle XML by default, for every input in a folder", async () => {
    const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", { inputs: [path.dirname(input("networks", "devices.haml"))], outputDir: path.join(out, "folder") });
    assert.deepEqual(results.map((r) => path.basename(r.input)), ["devices.haml", "protocols.xml"]);
    assert.deepEqual(results.map((r) => Object.keys(r.files)), [["moodle"], ["moodle"]]);
  });

  it("never writes over files without overwrite", async () => {
    const outputDir = path.join(out, "again");
    const args = { inputs: [input("networks", "protocols.xml")], outputDir };
    await call(await connect(), "generate_questions", args);
    writeFileSync(path.join(outputDir, "protocols-moodle.xml"), "the person's own");
    await assert.rejects(call(await connect(), "generate_questions", args), /there already/);
    assert.equal(readFileSync(path.join(outputDir, "protocols-moodle.xml"), "utf8"), "the person's own");
    await call(await connect(), "generate_questions", { ...args, overwrite: true });
    assert.notEqual(readFileSync(path.join(outputDir, "protocols-moodle.xml"), "utf8"), "the person's own");
  });

  it("writes nothing when Asker fails, and says why", async () => {
    const outputDir = path.join(out, "broken");
    const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", { inputs: [input("broken-rows", "rows.haml")], outputDir });
    assert.equal(results[0]!.ok, false);
    assert.match(results[0]!.errors[0]!, /columns size/);
    assert.ok(!existsSync(path.join(outputDir, "rows-moodle.xml")));
  });

  it("refuses to write the Moodle XML next to the input", async () => {
    await assert.rejects(call(await connect(), "generate_questions", { inputs: [input("networks", "protocols.xml")], outputDir: path.dirname(input("networks", "protocols.xml")) }), /another folder.*subfolder/);
  });

  it("refuses a category Asker can't take", async () => {
    await assert.rejects(call(await connect(), "generate_questions", { inputs: [input("networks", "protocols.xml")], outputDir: path.join(out, "x"), category: 'say "hi"' }), /double quotes/);
  });
});

describe("read_questions and exclude_questions", () => {
  let xmlFile: string;
  let giftFile: string;

  before(async () => {
    const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", { inputs: [input("networks", "devices.haml")], outputDir: path.join(out, "review"), formats: ["moodle", "gift"] });
    xmlFile = results[0]!.files.moodle!;
    giftFile = results[0]!.files.gift!;
  });

  it("reads a page at a time, with filters", async () => {
    const client = await connect();
    const first = await call<{ total: number; questions: { name: string; group: string }[]; next?: number; all: { total: number } }>(client, "read_questions", { path: xmlFile, limit: 10 });
    assert.equal(first.questions.length, 10);
    assert.equal(first.next, 10);
    assert.equal(first.total, first.all.total);
    const second = await call<{ questions: { name: string }[] }>(client, "read_questions", { path: xmlFile, offset: 10, limit: 10 });
    assert.notEqual(second.questions[0]!.name, first.questions[0]!.name);
    const hub = await call<{ total: number; questions: { group: string }[] }>(client, "read_questions", { path: xmlFile, group: "hub", limit: 50 });
    assert.ok(hub.total > 0 && hub.questions.every((q) => q.group === "hub"));
    const ordering = await call<{ questions: { type: string; order: string[] }[] }>(client, "read_questions", { path: xmlFile, type: "ordering" });
    assert.ok(ordering.questions.every((q) => q.type === "ordering" && q.order.length > 1));
    const misspelled = await call<{ total: number; questions: { template: string }[] }>(client, "read_questions", { path: xmlFile, template: "misspelled", limit: 50 });
    assert.ok(misspelled.total > 0 && misspelled.questions.every((q) => q.template.includes("misspelled")));
  });

  it("writes a copy without the questions left out, and keeps the original", async () => {
    const client = await connect();
    const { questions } = await call<{ questions: { name: string }[] }>(client, "read_questions", { path: xmlFile, limit: 2 });
    const names = [questions[0]!.name, questions[1]!.name, "no such question"];
    const before = readFileSync(xmlFile, "utf8");
    const outputPath = path.join(out, "review", "kept-moodle.xml");
    const result = await call<{ kept: number; removed: string[]; notFound: string[] }>(client, "exclude_questions", { path: xmlFile, names, outputPath });
    assert.deepEqual(result.removed, names.slice(0, 2));
    assert.deepEqual(result.notFound, ["no such question"]);
    assert.equal(readFileSync(xmlFile, "utf8"), before);
    assert.equal(readMoodleXml(readFileSync(outputPath, "utf8")).questions.length, result.kept);
    await assert.rejects(call(client, "exclude_questions", { path: xmlFile, names, outputPath }), /there already/);
    await assert.rejects(call(client, "exclude_questions", { path: xmlFile, names, outputPath: xmlFile, overwrite: true }), /somewhere else/);
  });

  it("leaves out a type in GIFT too", async () => {
    const outputPath = path.join(out, "review", "no-truefalse-gift.txt");
    const result = await call<{ kept: number; removed: string[] }>(await connect(), "exclude_questions", { path: giftFile, types: ["truefalse"], outputPath });
    assert.ok(result.removed.length > 0);
    assert.equal(giftNames(readFileSync(outputPath, "utf8")).length, result.kept);
  });
});
