// The tools through an MCP client, against the fake programs: no ffmpeg, Python or network needed.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { call, connect } from "../connect.js";
import { fakePrograms, fixture } from "../fake.js";

const work = mkdtempSync(path.join(tmpdir(), "video-mcp-work-"));
const files = mkdtempSync(path.join(tmpdir(), "video-mcp-files-"));
const video = path.join(files, "lesson.mp4");
writeFileSync(video, "not really a video: the fakes don't read it");
const youtube = "https://www.youtube.com/watch?v=abcDEF12345";

let restore = () => {};
before(() => {
  process.env.VIDEO_MCP_WORK_DIR = work;
});
after(() => {
  delete process.env.VIDEO_MCP_WORK_DIR;
});
afterEach(() => restore());

describe("get_video_info", () => {
  it("says what a YouTube video has, captions and chapters", async () => {
    restore = fakePrograms().restore;
    const info = await call(await connect(), "get_video_info", { source: youtube });
    assert.equal(info.kind, "youtube");
    assert.equal(info.length, "12:34");
    assert.equal(info.hasCaptions, true);
    assert.deepEqual(info.captions, { manual: ["es"], automatic: ["en-orig"], translations: true, embedded: [] });
    assert.deepEqual(info.chapters, [
      { start: 0, at: "00:00", title: "Intro" },
      { start: 95.5, at: "01:35", title: "Static routes" },
    ]);
  });

  it("says what a file holds, through ffprobe", async () => {
    restore = fakePrograms().restore;
    const info = await call<{ kind: string; hasCaptions: boolean; captions: { embedded: unknown[] } }>(await connect(), "get_video_info", { source: video });
    assert.equal(info.kind, "file");
    assert.equal(info.hasCaptions, true);
    assert.equal(info.captions.embedded.length, 2);
  });

  it("fails saying how to install yt-dlp when it's missing", async () => {
    restore = fakePrograms({ missing: ["yt-dlp"] }).restore;
    await assert.rejects(call(await connect(), "get_video_info", { source: youtube }), /yt-dlp is needed .*To install it, run /);
  });
});

describe("get_captions", () => {
  it("reads a subtitle file with no program at all", async () => {
    restore = fakePrograms({ missing: ["ffmpeg", "ffprobe", "yt-dlp", "python"] }).restore;
    const result = await call(await connect(), "get_captions", { source: fixture("lesson.srt") });
    assert.equal(result.found, true);
    assert.equal(result.kind, "file");
    assert.equal(result.cues, 2);
    assert.equal(result.text, "[00:01] Hola, bienvenidos a la clase. Hoy: redes & routers");
  });

  it("reads a YouTube video's captions in the language asked for", async () => {
    const { calls, restore: back } = fakePrograms();
    restore = back;
    const result = await call(await connect(), "get_captions", { source: youtube, language: "en" });
    assert.equal(result.found, true);
    assert.equal(result.kind, "automatic");
    assert.equal(result.language, "en");
    assert.match(String(result.text), /^\[00:01\] Today we build a router with two interfaces\n\[00:10\] and a default route\.$/);
    const download = calls.find((c) => c.args.includes("--write-auto-subs"));
    assert.ok(download?.args.includes("en-orig"));
  });

  it("says when a video has none, so it can be transcribed", async () => {
    restore = fakePrograms().restore;
    const result = await call(await connect(), "get_captions", { source: youtube, language: "ja" });
    assert.equal(result.found, false);
    assert.equal(result.cues, 0);
  });

  it("reads a file's own subtitles", async () => {
    restore = fakePrograms().restore;
    const result = await call(await connect(), "get_captions", { source: video });
    assert.equal(result.kind, "embedded");
    assert.equal(result.language, "spa");
  });

  it("refuses a picture-based subtitle stream", async () => {
    restore = fakePrograms().restore;
    await assert.rejects(call(await connect(), "get_captions", { source: video, stream: 1 }), /is pictures/);
  });
});

describe("transcribe_video and write_subtitles", () => {
  it("transcribe a file, keep the transcript, read it back the second time, and make a .vtt of it", async () => {
    const { calls, restore: back } = fakePrograms();
    restore = back;
    const client = await connect();
    const first = await call(client, "transcribe_video", { source: video, model: "base" });
    assert.equal(first.cached, false);
    assert.equal(first.language, "es");
    assert.equal(first.languageProbability, 0.97);
    assert.equal(first.cues, 3);
    assert.match(String(first.text), /^\[00:00\] Hola a todos, hoy vemos git hub\./);
    const transcript = String(first.transcript);
    assert.ok(existsSync(transcript));
    assert.deepEqual(
      readdirSync(path.dirname(transcript)).filter((f) => f.endsWith(".wav")),
      [],
      "the audio taken out is deleted",
    );
    const whisper = calls.find((c) => c.program === "python" && c.args[0] === "-c" && c.args[1]?.includes("WhisperModel"));
    assert.deepEqual(whisper?.args.slice(3), ["base", "", "cpu", "int8"]);

    const second = await call(client, "transcribe_video", { source: video, model: "base" });
    assert.equal(second.cached, true);
    assert.equal(calls.filter((c) => c.args[1]?.includes("WhisperModel")).length, 1);

    const output = path.join(files, "subs", "lesson.vtt");
    const written = await call(client, "write_subtitles", { from: transcript, outputPath: output, corrections: [{ from: "git hub", to: "GitHub" }] });
    assert.equal(written.path, output);
    const vtt = readFileSync(output, "utf8");
    assert.match(vtt, /^WEBVTT\n\n1\n00:00:00\.500 --> 00:00:03\.200\nHola a todos, hoy vemos GitHub\.\n/);
    for (const line of vtt.split("\n")) assert.ok(line.length <= 42, line);
    await assert.rejects(call(client, "write_subtitles", { from: transcript, outputPath: output }), /is there already/);
  });

  it("shift the times of a stretch, and download an address's audio only", async () => {
    const { calls, restore: back } = fakePrograms();
    restore = back;
    const result = await call(await connect(), "transcribe_video", { source: youtube, language: "es", from: 60, to: 120 });
    assert.match(String(result.text), /^\[01:00\] /);
    assert.equal(result.languageProbability, 1);
    const download = calls.find((c) => c.program === "yt-dlp" && c.args.includes("-f"));
    assert.equal(download?.args[download.args.indexOf("-f") + 1], "bestaudio/best");
    const ffmpeg = calls.find((c) => c.program === "ffmpeg" && c.args.at(-1)?.endsWith(".wav"));
    assert.deepEqual(ffmpeg?.args.slice(5, 9), ["-ss", "60", "-to", "120"]);
  });

  it("fail saying how to install faster-whisper when it isn't there", async () => {
    restore = fakePrograms({ noWhisper: true }).restore;
    await assert.rejects(call(await connect(), "transcribe_video", { source: video }), /Python with faster-whisper is needed .*faster-whisper isn't installed/);
  });

  it("write_subtitles takes cues, and refuses what isn't a .vtt", async () => {
    restore = fakePrograms().restore;
    const client = await connect();
    const output = path.join(files, "hand.vtt");
    const written = await call(client, "write_subtitles", { cues: [{ start: 1, end: 2, text: "Hola" }], outputPath: output });
    assert.equal(written.cues, 1);
    await assert.rejects(call(client, "write_subtitles", { cues: [{ start: 1, end: 2, text: "Hola" }], outputPath: path.join(files, "hand.srt") }), /must end in \.vtt/);
    await assert.rejects(call(client, "write_subtitles", { outputPath: path.join(files, "none.vtt") }), /either from .* or cues/);
  });
});

describe("extract_frames", () => {
  it("saves frames with their times, at most maxFrames, spread over the video", async () => {
    const { calls, restore: back } = fakePrograms();
    restore = back;
    const result = await call<{ found: number; frames: { time: number; at: string; path: string }[]; notes: string[] }>(await connect(), "extract_frames", { source: video, maxFrames: 3 });
    assert.equal(result.found, 4);
    assert.deepEqual(
      result.frames.map((f) => [f.at, path.basename(f.path)]),
      [
        ["00:00", "frame-001-00m00s.jpg"],
        ["01:01", "frame-002-01m01s.jpg"],
        ["02:05", "frame-003-02m05s.jpg"],
      ],
    );
    for (const frame of result.frames) assert.ok(existsSync(frame.path));
    assert.equal(readdirSync(path.dirname(result.frames[0]!.path)).length, 3);
    assert.match(result.notes[0] ?? "", /4 frames were found; 3 were kept/);
    const ffmpeg = calls.find((c) => c.program === "ffmpeg" && c.args.includes("-vf"));
    assert.match(ffmpeg?.args[ffmpeg.args.indexOf("-vf") + 1] ?? "", /gt\(scene,0\.3\)/);
  });

  it("download an address's picture first", async () => {
    const { calls, restore: back } = fakePrograms();
    restore = back;
    const result = await call<{ frames: unknown[] }>(await connect(), "extract_frames", { source: youtube, mode: "interval", every: 10 });
    assert.equal(result.frames.length, 4);
    const download = calls.find((c) => c.program === "yt-dlp" && c.args.includes("-f"));
    assert.match(download?.args[download.args.indexOf("-f") + 1] ?? "", /^bv\*\[height<=1080\]/);
  });
});

describe("check_requirements and server_info", () => {
  it("report the programs and the settings", async () => {
    restore = fakePrograms({ missing: ["ffmpeg"] }).restore;
    const client = await connect();
    const check = await call<{ ok: boolean; requirements: { name: string; ok: boolean; installBySystem: Record<string, string> }[] }>(client, "check_requirements");
    assert.equal(check.ok, false);
    assert.deepEqual(
      check.requirements.map((r) => [r.name, r.ok]),
      [
        ["ffmpeg", false],
        ["Python with faster-whisper", true],
        ["yt-dlp", true],
      ],
    );
    assert.ok(check.requirements[0]!.installBySystem.linux);
    const info = await call(client, "server_info");
    assert.equal(info.name, "@falkenslab/video-mcp");
    assert.equal(info.workFolder, path.resolve(work));
    assert.equal(info.whisperModel, "small");
  });
});
