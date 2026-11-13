import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { attribute, explain, foreignNeighbours, lintInput, looksLikeInput } from "../src/asker/lint.js";
import { input } from "./fake.js";

const root = mkdtempSync(path.join(tmpdir(), "asker-lint-"));
after(() => rmSync(root, { recursive: true, force: true }));
let n = 0;
/** Writes a file into a folder of its own, and returns its path. */
function file(name: string, text: string | Buffer): string {
  const folder = path.join(root, String(n++));
  mkdirSync(folder);
  const p = path.join(folder, name);
  writeFileSync(p, text);
  return p;
}
const devices = readFileSync(input("networks", "devices.haml"), "utf8");
const messages = (p: string) => lintInput(p).map((h) => `${h.line ?? "-"}: ${h.message}`);

describe("hints before Asker runs", () => {
  it("find nothing in a good input", () => {
    assert.deepEqual(lintInput(input("networks", "devices.haml")), []);
    assert.deepEqual(lintInput(input("networks", "protocols.xml")), []);
    assert.deepEqual(lintInput(input("media", "painters.haml")), []);
    assert.deepEqual(lintInput(input("code", "python.haml")), []);
  });

  it("find invisible characters and indentation, with their lines", () => {
    assert.match(messages(file("bom.haml", "\ufeff" + devices))[0]!, /^1: .*byte-order mark/);
    const tab = devices.replace("    %names hub", "\t%names hub");
    assert.match(messages(file("tab.haml", tab)).join("\n"), /^\d+: has a tab/m);
    const nbsp = devices.replace("    %names hub", "\u00a0   %names hub");
    assert.match(messages(file("nbsp.haml", nbsp)).join("\n"), /invisible character/);
    const odd = devices.replace("    %names hub", "     %names hub");
    const line = devices.split("\n").indexOf("    %names hub") + 1;
    assert.ok(messages(file("odd.haml", odd)).includes(`${line}: is indented with 5 spaces: Asker indents in steps of two (0 for %map, 2 for %concept, 4 for its keywords, 6 for %row, 8 or 10 for %col)`));
  });

  it("find empty or misspelled definitions, and files and links that won't load", () => {
    const text = devices.replace(
      "    %def Old network device that repeats every signal it receives to all its ports",
      "    %def\n    %def { type: 'file'} images/x.png\n    %def{ type: 'file'} images/missing.png\n    %def{ type: 'file'} https://drive.google.com/file/d/abc/view\n    %def{ type: 'file'} https://example.org/hub.png?size=2",
    );
    const found = messages(file("defs.haml", text)).join("\n");
    assert.match(found, /a %def with no text/);
    assert.match(found, /space between %def and \{/);
    assert.match(found, /names images\/missing\.png, which isn't there: paths are relative to the input's folder/);
    assert.match(found, /link that doesn't end in an image, audio or video file name/);
    assert.doesNotMatch(found, /hub\.png/);
  });

  it("find a %map without its language, or with one Asker doesn't know", () => {
    assert.match(messages(file("nolang.haml", devices.replace("lang: 'en', ", ""))).join("\n"), /^1: %map has no lang/);
    assert.match(messages(file("nocontext.haml", devices.replace("context: 'computer networks, devices', ", ""))).join("\n"), /^1: %map has no context/m);
    assert.match(messages(file("de.haml", devices.replace("lang: 'en'", "lang: 'de'"))).join("\n"), /lang is 'de'/);
    assert.deepEqual(lintInput(file("old.haml", devices.replace("%map{ lang: 'en', context: 'computer networks, devices', version: '1'}", "%map{ :lang => 'en', :context => 'networks', :version => '1'}"))), []);
    assert.match(messages(file("nomap.haml", devices.split("\n").slice(2).join("\n"))).join("\n"), /first line, and it must be the %map/);
  });

  it("find an empty file, and XML that isn't well formed or isn't an input", () => {
    assert.deepEqual(messages(file("empty.haml", "  \n")), ["-: is empty"]);
    assert.match(messages(file("bad.xml", "<map lang='en'>\n<concept>\n<names>a</names>\n</concepto>\n</map>"))[0]!, /^\d: isn't well-formed XML/);
    assert.match(messages(file("quiz.xml", "<?xml version='1.0'?><quiz></quiz>"))[0]!, /isn't an Asker input: its root is <quiz>/);
    assert.match(messages(file("nolang.xml", "<map context='x'><concept><names>a</names><def>b</def></concept></map>"))[0]!, /<map> has no lang/);
  });
});

describe("files next to an input", () => {
  it("tell Asker inputs from the rest", () => {
    assert.equal(looksLikeInput(input("networks", "devices.haml")), true);
    assert.equal(looksLikeInput(input("networks", "protocols.xml")), true);
    const folder = path.dirname(file("good.haml", devices));
    writeFileSync(path.join(folder, "good-moodle.xml"), "<?xml version='1.0' encoding='UTF-8'?>\n<quiz>\n</quiz>\n");
    writeFileSync(path.join(folder, "notes.haml"), "%p Some notes\n");
    writeFileSync(path.join(folder, "other.xml"), "<!-- an input -->\n<map lang='en'></map>");
    assert.deepEqual(foreignNeighbours(path.join(folder, "good.haml")), ["good-moodle.xml", "notes.haml"]);
  });
});

describe("Asker's messages", () => {
  it("are explained when they're known", () => {
    assert.match(explain(["EmbebbedFile::Type.for: Unknown URL type (https://x)"])[0]!, /link straight to the file/);
    assert.match(explain(["LangFactory: Unknown Lang with [code=]"])[0]!, /isn't an Asker input at all/);
    assert.match(explain(["LangFactory: Unknown Lang with [code=de]"])[0]!, /en, es, fr, ca, du/);
    assert.match(explain(["Row: columns size != table.fields.size (<row>)"])[0]!, /one %col per field/);
    assert.deepEqual(explain(["Something new"]), []);
  });

  it("say which file an error comes from when it's another in the folder", () => {
    const error = "HamlLoader: Can't load file (C:\\x\\folder/broken.haml) Inconsistent indentation";
    assert.match(attribute(error, "C:\\x\\folder\\good.haml"), /^In broken\.haml, another file in the input's folder/);
    assert.equal(attribute(error, "C:\\x\\folder\\broken.haml"), error);
  });
});
