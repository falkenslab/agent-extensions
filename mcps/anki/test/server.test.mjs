// The built server, as an agent runs it: dist/server.mjs over stdio (run `npm run build` first).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const server = path.resolve(import.meta.dirname, "../dist/server.mjs");

test("the bundled server lists its tools and writes and reads a deck", { skip: !existsSync(server) && "no dist/server.mjs: run npm run build" }, async () => {
  const client = new Client({ name: "test", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
  try {
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    assert.deepEqual(Object.keys(byName).sort(), ["add_to_deck", "read_deck", "server_info", "write_deck"]);
    assert.equal(byName.read_deck.annotations.readOnlyHint, true);
    assert.equal(byName.server_info.annotations.readOnlyHint, true);
    assert.equal(byName.write_deck.annotations.readOnlyHint, false);

    const file = path.join(mkdtempSync(path.join(tmpdir(), "anki-server-")), "deck.apkg");
    const written = await client.callTool({ name: "write_deck", arguments: { path: file, deck: "Test", cards: [{ front: "1 + 1", back: "2" }] } });
    assert.ok(!written.isError, written.content[0].text);
    assert.match(written.content[0].text, /1 note, 1 card/);
    const read = await client.callTool({ name: "read_deck", arguments: { path: file } });
    assert.equal(JSON.parse(read.content[0].text).notes[0].fields.Back, "2");
    const again = await client.callTool({ name: "write_deck", arguments: { path: file, deck: "Test", cards: [{ front: "1 + 1", back: "2" }] } });
    assert.equal(again.isError, true);
    assert.match(again.content[0].text, /already exists/);
  } finally {
    await client.close();
  }
});
