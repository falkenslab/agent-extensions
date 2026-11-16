import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { clock, paragraphs, parseSrt, parseSubtitles, parseTimestamp, parseVtt, plainText, transcriptPage } from "../../src/video/cues.js";
import { fixture } from "../fake.js";

describe("cues", () => {
  it("read timestamps in WebVTT's and SRT's forms", () => {
    assert.equal(parseTimestamp("00:01:02.500"), 62.5);
    assert.equal(parseTimestamp("01:02.5"), 62.5);
    assert.equal(parseTimestamp("1:00:00,040"), 3600.04);
    assert.equal(parseTimestamp("later"), undefined);
  });

  it("show times as mm:ss, or h:mm:ss past an hour", () => {
    assert.equal(clock(83.9), "01:23");
    assert.equal(clock(3725), "1:02:05");
  });

  it("make cue text plain: tags, YouTube's word timings and entities", () => {
    assert.equal(plainText("<v Ana>Hi</v> <i>there</i> &amp; <00:00:01.200><c.colorE5E5E5>you</c> &lt;3"), "Hi there & you <3");
    assert.equal(plainText("List<String> stays"), "List<String> stays");
  });

  it("read WebVTT, ignoring its header, notes and cue settings", () => {
    const cues = parseVtt("﻿WEBVTT - a title\n\nNOTE written by hand\n\nintro\n00:00:01.000 --> 00:00:02.500 align:start\nFirst line\nsecond line\n\n00:00:03.000 --> 00:00:04.000\nThird\n");
    assert.deepEqual(cues, [
      { start: 1, end: 2.5, text: "First line\nsecond line" },
      { start: 3, end: 4, text: "Third" },
    ]);
  });

  it("refuse a file that isn't WebVTT as WebVTT", () => {
    assert.throws(() => parseVtt("1\n00:00:01,000 --> 00:00:02,000\nhi\n"), /isn't WebVTT/);
  });

  it("make YouTube's rolling automatic captions read once each", () => {
    const cues = parseVtt(readFileSync(fixture("youtube-auto.vtt"), "utf8"));
    assert.deepEqual(
      cues.map((c) => c.text),
      ["Today we build a router", "with two interfaces", "and a default route."],
    );
    assert.equal(cues[0]!.start, 1);
  });

  it("read SRT", () => {
    const cues = parseSrt(readFileSync(fixture("lesson.srt"), "utf8"));
    assert.deepEqual(cues, [
      { start: 1, end: 3.5, text: "Hola, bienvenidos\na la clase." },
      { start: 4, end: 6.25, text: "Hoy: redes & routers" },
    ]);
    assert.equal(parseSubtitles(readFileSync(fixture("lesson.srt"), "utf8"), ".srt").length, 2);
    assert.throws(() => parseSrt("just words"), /isn't SRT/);
  });

  it("join cues into paragraphs, starting another after a pause", () => {
    const joined = paragraphs([
      { start: 0, end: 2, text: "one" },
      { start: 2.5, end: 4, text: "two" },
      { start: 10, end: 11, text: "three" },
    ]);
    assert.deepEqual(joined, [
      { start: 0, end: 4, text: "one two" },
      { start: 10, end: 11, text: "three" },
    ]);
  });

  it("page a long transcript at paragraphs", () => {
    const cues = Array.from({ length: 50 }, (_, i) => ({ start: i * 10, end: i * 10 + 2, text: `Paragraph ${i} ${"word ".repeat(60)}`.trim() }));
    const first = transcriptPage(cues, 0, 2000);
    assert.equal(first.paragraphs, 50);
    assert.ok(first.text.length <= 2000);
    assert.match(first.text, /^\[00:00\] Paragraph 0 /);
    assert.ok(first.next && first.next > 0);
    const last = transcriptPage(cues, 48, 2000);
    assert.equal(last.next, undefined);
    assert.match(last.text, /^\[08:00\] Paragraph 48/);
  });
});
