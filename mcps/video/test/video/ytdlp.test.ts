import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chooseTrack, parseInfo, ytDlpError } from "../../src/video/ytdlp.js";
import { fixture } from "../fake.js";

const info = parseInfo(readFileSync(fixture("youtube-info.json"), "utf8"));

describe("yt-dlp", () => {
  it("reads a video's details, its tracks and its chapters", () => {
    assert.equal(info.title, "Routing basics");
    assert.equal(info.duration, 754);
    assert.deepEqual(info.manual, ["es"]);
    assert.deepEqual(info.automatic, ["en-orig"]);
    assert.equal(info.translations, true);
    assert.deepEqual(info.chapters[1], { start: 95.5, end: 754, title: "Static routes" });
  });

  it("refuses a playlist and what isn't JSON", () => {
    assert.throws(() => parseInfo('{"_type":"playlist"}'), /playlist/);
    assert.throws(() => parseInfo("ERROR"), /didn't answer/);
  });

  it("chooses someone's captions first, then automatic ones, then a translation", () => {
    assert.deepEqual(chooseTrack(info, "es"), { key: "es", language: "es", kind: "manual" });
    assert.deepEqual(chooseTrack(info, "en"), { key: "en-orig", language: "en", kind: "automatic" });
    assert.deepEqual(chooseTrack(info, "fr"), { key: "fr", language: "fr", kind: "translated" });
    assert.equal(chooseTrack(info, "ja"), undefined);
  });

  it("chooses the video's own captions with no language", () => {
    assert.deepEqual(chooseTrack(info), { key: "es", language: "es", kind: "manual" });
    assert.deepEqual(chooseTrack({ ...info, manual: [] }), { key: "en-orig", language: "en", kind: "automatic" });
    assert.equal(chooseTrack({ ...info, manual: [], automatic: [] }), undefined);
  });

  it("says what failed in yt-dlp's own words", () => {
    assert.equal(ytDlpError("WARNING: slow\nERROR: [youtube] x: Video unavailable\n"), "ERROR: [youtube] x: Video unavailable");
    assert.equal(ytDlpError("", ""), "no message");
  });
});
