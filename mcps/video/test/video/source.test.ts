import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { parseSource, slugOf, youtubeId } from "../../src/video/source.js";

describe("sources", () => {
  it("find a YouTube video's id in its addresses", () => {
    for (const url of ["https://www.youtube.com/watch?v=abcDEF12345&t=10", "https://youtu.be/abcDEF12345?si=x", "https://www.youtube.com/embed/abcDEF12345", "https://youtube.com/shorts/abcDEF12345"])
      assert.equal(youtubeId(url), "abcDEF12345", url);
    assert.equal(youtubeId("https://vimeo.com/123"), undefined);
  });

  it("take an address or an absolute path to a file", () => {
    assert.deepEqual(parseSource("https://youtu.be/abcDEF12345"), { kind: "url", url: "https://youtu.be/abcDEF12345", youtubeId: "abcDEF12345", extension: "" });
    assert.equal(parseSource("https://example.org/subs/en.vtt?x=1").extension, ".vtt");
    assert.throws(() => parseSource("video.mp4"), /absolute path/);
    assert.throws(() => parseSource("ftp://example.org/v.mp4"), /only http/);
    assert.throws(() => parseSource(path.join(tmpdir(), "no-such-video.mp4")), /no such file/);
    assert.throws(() => parseSource(tmpdir()), /is a folder/);
  });

  it("give each source a folder name of its own", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "video-mcp-test-"));
    const file = path.join(dir, "Clase 3, redes (parte 1).mp4");
    writeFileSync(file, "x");
    assert.match(slugOf(parseSource(file)), /^Clase-3-redes-parte-1-[0-9a-f]{8}$/);
    assert.equal(slugOf(parseSource("https://youtu.be/abcDEF12345")), "youtube-abcDEF12345");
    assert.match(slugOf(parseSource("https://example.org/media/talk.mp4")), /^example.org-talk-[0-9a-f]{8}$/);
  });
});
