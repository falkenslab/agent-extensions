// The bundled server (dist/server.mjs, as the extension runs it) over stdio: run `npm run build` first.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const server = path.resolve(import.meta.dirname, "../dist/server.mjs");
const folder = mkdtempSync(path.join(tmpdir(), "calendar-test-"));
let client;

before(async () => {
  client = new Client({ name: "test", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
});
after(async () => {
  await client?.close();
  rmSync(folder, { recursive: true, force: true });
});

const call = (name, args) => client.callTool({ name, arguments: args });

test("tools/list: three tools, annotated", async () => {
  const { tools } = await client.listTools();
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  assert.deepEqual(Object.keys(byName).sort(), ["read_ics", "server_info", "write_ics"]);
  assert.equal(byName.read_ics.annotations.readOnlyHint, true);
  assert.equal(byName.server_info.annotations.readOnlyHint, true);
  assert.equal(byName.write_ics.annotations.readOnlyHint, false);
  assert.equal(byName.write_ics.annotations.destructiveHint, false);
});

test("write_ics writes, refuses to overwrite, and read_ics reads it back", async () => {
  const file = path.join(folder, "plan.ics");
  const args = { path: file, timeZone: "Europe/Madrid", events: [{ title: "Class", start: "2026-09-14T09:00", end: "10:00", repeat: { frequency: "weekly", byDay: ["MO"], count: 4 }, reminders: [10] }] };
  const written = await call("write_ics", args);
  assert.equal(written.isError, undefined, written.content[0].text);
  const result = JSON.parse(written.content[0].text);
  assert.equal(result.events.length, 1);
  assert.match(readFileSync(file, "utf8"), /^BEGIN:VCALENDAR\r\n/);

  const again = await call("write_ics", args);
  assert.equal(again.isError, true);
  assert.match(again.content[0].text, /already exists/);

  const replaced = await call("write_ics", { ...args, overwrite: true, events: [{ ...args.events[0], uid: result.events[0].uid, title: "Class (room 4)" }] });
  assert.equal(replaced.isError, undefined, replaced.content[0].text);

  const read = JSON.parse((await call("read_ics", { path: file })).content[0].text);
  assert.equal(read.events[0].title, "Class (room 4)");
  assert.equal(read.events[0].uid, result.events[0].uid);
  assert.equal(read.events[0].repeat.text, "every week on Monday, 4 times");
});

test("write_ics: clear errors, nothing written", async () => {
  const relative = await call("write_ics", { path: "plan.ics", events: [{ title: "A", start: "2026-01-01" }] });
  assert.match(relative.content[0].text, /absolute/);
  const noFolder = await call("write_ics", { path: path.join(folder, "nope", "a.ics"), events: [{ title: "A", start: "2026-01-01" }] });
  assert.match(noFolder.content[0].text, /doesn't exist/);
  const file = path.join(folder, "bad.ics");
  const bad = await call("write_ics", { path: file, events: [{ title: "A", start: "2026-01-01T10:00" }] });
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /needs a time zone/);
  assert.throws(() => readFileSync(file));
});

test("read_ics: a file that isn't a calendar says so", async () => {
  const file = path.join(folder, "notes.ics");
  writeFileSync(file, "hello\n");
  const read = JSON.parse((await call("read_ics", { path: file })).content[0].text);
  assert.match(read.problems.join(" "), /isn't an iCalendar file/);
});

test("server_info", async () => {
  const info = JSON.parse((await call("server_info", {})).content[0].text);
  assert.equal(info.name, "calendar");
  assert.match(info.version, /^\d+\.\d+\.\d+$/);
});
