import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVtt } from "../../src/video/cues.js";
import { balance, correct, toVtt, vttTimestamp, wrap } from "../../src/video/vtt.js";

describe("WebVTT writer", () => {
  it("writes timestamps with hours and milliseconds", () => {
    assert.equal(vttTimestamp(0), "00:00:00.000");
    assert.equal(vttTimestamp(3723.4567), "01:02:03.457");
  });

  it("writes a valid file that reads back the same", () => {
    const { vtt, cues, notes } = toVtt([
      { start: 0.5, end: 3, text: "Hola a todos." },
      { start: 3.5, end: 6, text: "Hoy vemos Git." },
    ]);
    assert.equal(vtt, "WEBVTT\n\n1\n00:00:00.500 --> 00:00:03.000\nHola a todos.\n\n2\n00:00:03.500 --> 00:00:06.000\nHoy vemos Git.\n");
    assert.deepEqual(notes, []);
    assert.deepEqual(parseVtt(vtt), cues);
  });

  it("sorts, cuts overlaps, drops empty cues and lengthens flashes", () => {
    const { cues, notes } = toVtt([
      { start: 5, end: 9, text: "second" },
      { start: 0, end: 6, text: "first" },
      { start: 9, end: 9.1, text: "flash" },
      { start: 12, end: 13, text: "   " },
    ]);
    assert.deepEqual(
      cues.map((c) => [c.start, c.end, c.text]),
      [
        [0, 5, "first"],
        [5, 9, "second"],
        [9, 9.5, "flash"],
      ],
    );
    assert.equal(notes.length, 4);
  });

  it("escapes what WebVTT reserves", () => {
    const { vtt } = toVtt([{ start: 0, end: 2, text: "a < b && c --> d" }]);
    assert.match(vtt, /a &lt; b &amp;&amp; c --&gt; d/);
    assert.equal(vtt.split("-->").length, 2, "the only arrow is the timing line's");
  });

  it("wraps into balanced lines and splits what doesn't fit two", () => {
    assert.deepEqual(wrap("one two three", 7), ["one two", "three"]);
    assert.deepEqual(balance("All right, so here we are, in front of the elephants.", 42), ["All right, so here we are,", "in front of the elephants."]);
    const long = "word ".repeat(40).trim();
    const { cues } = toVtt([{ start: 0, end: 20, text: long }]);
    assert.ok(cues.length >= 3);
    for (const cue of cues) for (const line of cue.text.split("\n")) assert.ok(line.length <= 42, line);
    assert.equal(cues[0]!.start, 0);
    assert.ok(Math.abs(cues.at(-1)!.end - 20) < 1e-9);
  });

  it("makes corrections as whole words, ignoring case", () => {
    assert.equal(correct("Hoy vemos git hub y GIT HUB, no githubs", [{ from: "git hub", to: "GitHub" }]), "Hoy vemos GitHub y GitHub, no githubs");
    assert.equal(correct("el niño", [{ from: "niño", to: "chico" }]), "el chico");
    assert.equal(correct("c++ and c", [{ from: "c++", to: "C++" }]), "C++ and c");
  });
});
