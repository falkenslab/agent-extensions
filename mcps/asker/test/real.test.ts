// The tools with the real Asker, when it's installed: skipped with a notice when not, and required when
// ASKER_MCP_REAL_TESTS=required (CI installs it).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { giftNames } from "../src/asker/files.js";
import { readMoodleXml } from "../src/asker/questions.js";
import { reference } from "../src/asker/reference.js";
import { checkRequirements, forgetAsker } from "../src/requirements.js";
import { call, connect } from "./connect.js";
import { input } from "./fake.js";

const status = await checkRequirements();
const required = process.env.ASKER_MCP_REAL_TESTS === "required";
if (!status.ok && required) throw new Error(`The real Asker is required here: ${status.requirements.map((r) => `${r.name}: ${r.problem ?? "ok"}`).join("; ")}`);
const skip = status.ok ? false : "Ruby and Asker aren't installed: the tests with the real Asker are skipped";
if (skip) console.error(skip);

interface Result {
  ok: boolean;
  files: { moodle?: string; gift?: string };
  groups?: { group: string; total: number }[];
  counts?: { total: number };
  errors: string[];
  notes: string[];
}

describe("with the real Asker", { skip }, () => {
  let out: string;
  before(() => {
    forgetAsker(false);
    out = mkdtempSync(path.join(tmpdir(), "asker-mcp-real-"));
  });
  after(() => rmSync(out, { recursive: true, force: true }));

  it("finds Asker 2.10 or later", async () => {
    const result = await call<{ ok: boolean; requirements: { name: string; version?: string }[] }>(await connect(), "check_requirements");
    assert.equal(result.ok, true);
    assert.match(result.requirements.find((r) => r.name === "Asker")!.version!, /^2\.(1\d|[2-9]\d)/);
  });

  it("reports a syntax error with its line, and generates nothing", async () => {
    const result = await call<{ ok: boolean; syntax: { errors: { line: number }[] }; wouldGenerate?: unknown }>(await connect(), "check_input", { path: input("broken-syntax", "syntax.haml") });
    assert.equal(result.ok, false);
    assert.deepEqual(result.syntax.errors.map((e) => e.line), [6, 7]);
    assert.equal(result.wouldGenerate, undefined);
  });

  it("reports what only shows loading", async () => {
    const result = await call<{ ok: boolean; errors: string[] }>(await connect(), "check_input", { path: input("broken-rows", "rows.haml") });
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /columns size/);
  });

  for (const [folder, file, groups] of [
    ["networks", "devices.haml", ["router", "switch", "hub", "firewall"]],
    ["networks", "protocols.xml", ["HTTP", "DNS", "DHCP"]],
    ["maths", "equations.haml", undefined],
    ["code", "python.haml", ["greet.py"]],
    ["media", "painters.haml", ["Joan Miro", "Frida Kahlo", "Claude Monet"]],
  ] as const) {
    it(`generates ${file}, every question with its group and kind, and a whole GIFT`, async () => {
      const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", { inputs: [input(folder, file)], outputDir: path.join(out, folder), formats: ["moodle", "gift"], category: "Asker tests", overwrite: true });
      const [result] = results;
      assert.ok(result?.ok, result?.errors.join("\n"));
      const xml = readMoodleXml(readFileSync(result.files.moodle!, "utf8"));
      assert.equal(xml.category, "$course$/Asker tests");
      assert.ok(xml.questions.length > 0);
      assert.deepEqual(xml.questions.filter((q) => q.kind === "other").map((q) => q.name), []);
      assert.equal(xml.questions.filter((q) => q.type === "ddmatch").length, 0);
      if (groups) assert.deepEqual(result.groups!.map((g) => g.group).sort(), [...groups].sort());
      // GIFT has every question but those embedding a file, which it can't carry: said in a note.
      const inGift = new Set(giftNames(readFileSync(result.files.gift!, "utf8")));
      const missing = xml.questions.filter((q) => !inGift.has(q.name));
      assert.deepEqual(missing.filter((q) => !q.files?.length).map((q) => q.name), []);
      if (missing.length) assert.match(result.notes.join("\n"), /can't carry files/);
    });
  }

  it("takes the question types asked for", async () => {
    const { results } = await call<{ results: Result[] }>(await connect(), "generate_questions", { inputs: [input("networks", "devices.haml")], outputDir: path.join(out, "stages"), stages: ["sequences"], overwrite: true });
    const xml = readMoodleXml(readFileSync(results[0]!.files.moodle!, "utf8"));
    assert.ok(xml.questions.length > 0);
    assert.deepEqual([...new Set(xml.questions.map((q) => q.kind))], ["sequences"]);
  });

  it("accepts every example in asker_input_reference that needs no other file", async () => {
    const dir = path.join(out, "reference");
    const blocks = [...reference().matchAll(/```haml\n([\s\S]*?)```/g)].map((m) => m[1] ?? "").filter((b) => !/%path|type: 'file'/.test(b));
    assert.ok(blocks.length >= 5);
    const client = await connect();
    for (const [i, block] of blocks.entries()) {
      const folder = path.join(dir, String(i));
      mkdirSync(folder, { recursive: true });
      let haml = block;
      if (!haml.startsWith("%map")) {
        const map = "%map{ lang: 'en', context: 'test', version: '1'}\n\n";
        haml = haml.startsWith("    %table") ? `${map}  %concept\n    %names example\n    %tags one, two\n    %def An example concept\n${haml}` : `${map}${haml}`;
      }
      const file = path.join(folder, "example.haml");
      writeFileSync(file, haml);
      const result = await call<{ ok: boolean; syntax?: { errors: unknown[] }; errors: string[]; wouldGenerate?: { total: number } }>(client, "check_input", { path: file });
      assert.ok(result.ok, `example ${i}:\n${haml}\n${JSON.stringify(result)}`);
      assert.ok(result.wouldGenerate!.total > 0, `example ${i} makes no question`);
      assert.ok(existsSync(file));
    }
  });
});
