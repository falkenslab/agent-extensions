import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseProbe } from "../../src/video/probe.js";
import { fixture } from "../fake.js";

describe("ffprobe", () => {
  it("reads a file's length, picture, sound, subtitles and chapters", () => {
    const info = parseProbe(readFileSync(fixture("ffprobe.json"), "utf8"));
    assert.deepEqual(info, {
      title: "Lesson 3",
      duration: 125.4,
      width: 1280,
      height: 720,
      hasVideo: true,
      hasAudio: true,
      subtitles: [
        { index: 0, codec: "mov_text", text: true, language: "spa", title: "Español" },
        { index: 1, codec: "hdmv_pgs_subtitle", text: false },
      ],
      chapters: [{ start: 0, end: 60, title: "Part 1" }],
    });
  });

  it("doesn't take an audio file's cover for a picture", () => {
    const info = parseProbe(JSON.stringify({ streams: [{ codec_type: "audio" }, { codec_type: "video", disposition: { attached_pic: 1 } }], format: {} }));
    assert.equal(info.hasVideo, false);
  });
});
