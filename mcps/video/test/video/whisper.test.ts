import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWhisperLine, parseWhisperOutput, whisperError } from "../../src/video/whisper.js";
import { WHISPER_LINES } from "../fake.js";

describe("faster-whisper's output", () => {
  it("reads the info and each segment, trimmed", () => {
    const { info, cues } = parseWhisperOutput(`Loading…\n${WHISPER_LINES.join("\r\n")}\n`);
    assert.deepEqual(info, { language: "es", probability: 0.97, duration: 12.5 });
    assert.equal(cues.length, 3);
    assert.deepEqual(cues[0], { start: 0.5, end: 3.2, text: "Hola a todos, hoy vemos git hub." });
  });

  it("reads the script's own error, and ignores other lines", () => {
    assert.deepEqual(parseWhisperLine('{"error": "faster-whisper is not installed for this Python"}'), { error: "faster-whisper is not installed for this Python" });
    assert.equal(parseWhisperLine("[ctranslate2] warning"), undefined);
    assert.equal(parseWhisperLine('{"other": 1}'), undefined);
  });

  it("explains the usual failures", () => {
    assert.match(whisperError("Traceback…\nrequests.exceptions.ConnectionError: Max retries exceeded with url: huggingface.co"), /needs the internet once/);
    assert.match(whisperError("RuntimeError: CUDA failed with error"), /set the whisper device to cpu/);
    assert.match(whisperError("ValueError: Invalid model size 'huge'"), /tiny, base, small/);
  });
});
