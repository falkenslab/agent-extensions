import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { strToU8, zipSync } from "fflate";
import { createServer } from "../../src/createServer.js";

async function connect() {
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const text = (result: Awaited<ReturnType<Client["callTool"]>>) => (result.content as { text: string }[])[0]?.text ?? "";

describe("H5P tools", () => {
  it("annotates list and read as read-only, build as a write that destroys nothing", async () => {
    const { tools } = await (await connect()).listTools();
    const annotations = (name: string) => tools.find((t) => t.name === name)?.annotations;
    assert.equal(annotations("list_h5p_types")?.readOnlyHint, true);
    assert.equal(annotations("read_h5p")?.readOnlyHint, true);
    assert.deepEqual(
      { readOnly: annotations("build_h5p")?.readOnlyHint, destructive: annotations("build_h5p")?.destructiveHint, idempotent: annotations("build_h5p")?.idempotentHint },
      { readOnly: false, destructive: false, idempotent: false },
    );
  });

  it("lists the eight content types, and a type's fields without its buttons and media", async () => {
    const client = await connect();
    const all = (await client.callTool({ name: "list_h5p_types", arguments: {} })).structuredContent as { types: { type: string; partOnly?: boolean; fields?: unknown }[] };
    assert.equal(all.types.filter((t) => !t.partOnly).length, 8);
    assert.equal(all.types.some((t) => t.fields), false);
    const one = (await client.callTool({ name: "list_h5p_types", arguments: { type: "H5P.MultiChoice" } })).structuredContent as { types: { fields: { name: string; required: boolean; item?: { fields?: { name: string }[] } }[] }[] };
    const fields = one.types[0]?.fields ?? [];
    assert.deepEqual(
      fields.map((f) => f.name),
      ["question", "answers", "overallFeedback", "behaviour"],
    );
    assert.equal(fields[0]?.required, true);
    assert.deepEqual(
      fields[1]?.item?.fields?.map((f) => f.name),
      ["text", "correct", "tipsAndFeedback"],
    );
  });

  it("builds a package and its preview, and reads it back", async () => {
    const client = await connect();
    const dir = mkdtempSync(path.join(tmpdir(), "h5p-"));
    const content = JSON.parse(readFileSync("test/fixtures/content/H5P.Dialogcards.json", "utf8")) as Record<string, unknown>;
    const built = await client.callTool({ name: "build_h5p", arguments: { type: "H5P.Dialogcards", title: "Vocabulario", language: "es", content, destDir: dir } });
    assert.equal(built.isError, undefined);
    assert.deepEqual(readdirSync(dir).sort(), ["vocabulario.h5p", "vocabulario.preview.html"]);
    const read = (await client.callTool({ name: "read_h5p", arguments: { path: path.join(dir, "vocabulario.h5p") } })).structuredContent as Record<string, unknown>;
    assert.deepEqual({ type: read.type, version: read.version, title: read.title, language: read.language, supported: read.supported }, { type: "H5P.Dialogcards", version: "1.9", title: "Vocabulario", language: "es", supported: true });
  });

  it("says what to fix when the content is wrong", async () => {
    const result = await (await connect()).callTool({
      name: "build_h5p",
      arguments: { type: "H5P.MultiChoice", title: "Q", language: "es", content: { question: "?", answers: [{ text: "a", correct: false }, { text: "b", correct: false }] }, destDir: tmpdir() },
    });
    assert.equal(result.isError, true);
    assert.match(text(result), /answers: needs at least one answer with correct: true/);
  });

  it("reads a package with libraries, its content only", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "h5p-"));
    const file = path.join(dir, "with-libraries.h5p");
    const fixture = (name: string) => strToU8(readFileSync(`test/fixtures/multichoice/${name}`, "utf8"));
    writeFileSync(file, zipSync({ "h5p.json": fixture("h5p.json"), "content/content.json": fixture("content/content.json"), "H5P.MultiChoice-1.16/library.json": strToU8("{}") }));
    const read = (await (await connect()).callTool({ name: "read_h5p", arguments: { path: file } })).structuredContent as Record<string, unknown>;
    assert.equal(read.type, "H5P.MultiChoice");
    assert.equal(read.supported, true);
    assert.deepEqual(read.libraries, ["H5P.MultiChoice-1.16"]);
    assert.equal((read.content as { answers: unknown[] }).answers.length, 3);
  });

  it("says when a file isn't a package", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "h5p-")), "nope.h5p");
    writeFileSync(file, "not a zip");
    const result = await (await connect()).callTool({ name: "read_h5p", arguments: { path: file } });
    assert.equal(result.isError, true);
    assert.match(text(result), /isn't an \.h5p package/);
  });
});
