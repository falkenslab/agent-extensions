// Transcribing: faster-whisper reads the video (or its downloaded audio) itself, through the PyAV it brings,
// so no ffmpeg is needed, and turns it into timed text, and the transcript is kept as JSON in the source's folder, so a second
// call (the next page, or write_subtitles) doesn't transcribe again.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { whisperDevice } from "../config.js";
import { locate, run } from "../run.js";
import type { Cue } from "./cues.js";
import { folderOf, mediaFile } from "./media.js";
import { describe, type Source } from "./source.js";
import { NOT_INSTALLED, WHISPER_SCRIPT, parseWhisperLine, whisperError, type WhisperInfo } from "./whisper.js";

/** A transcript as it's kept: what write_subtitles reads back. */
export interface Transcript {
  source: string;
  model: string;
  /** The language asked for, or the one detected. */
  language: string;
  /** How sure whisper was of the language it detected (1 when it was given). */
  languageProbability: number;
  /** The audio's length, in seconds. */
  duration: number;
  from?: number;
  to?: number;
  cues: Cue[];
}

export interface TranscribeOptions {
  model: string;
  language?: string;
  from?: number;
  to?: number;
  /** Called as whisper goes: seconds done, of how many. */
  onProgress?: (done: number, total: number) => void;
}

/** The transcript file's name for these options: one per model, language and stretch. */
export function transcriptName(options: Pick<TranscribeOptions, "model" | "language" | "from" | "to">): string {
  const part = options.from !== undefined || options.to !== undefined ? `-${options.from ?? 0}-${options.to ?? "end"}` : "";
  return `transcript-${options.model}-${options.language ?? "auto"}${part}.json`;
}

/** Reads a kept transcript, or a JSON with cues; an error says what's wrong. */
export function readTranscript(file: string): Transcript {
  let data: Partial<Transcript>;
  try {
    data = JSON.parse(readFileSync(file, "utf8")) as Partial<Transcript>;
  } catch {
    throw new Error(`${file} isn't a transcript: it isn't JSON`);
  }
  if (!Array.isArray(data.cues)) throw new Error(`${file} isn't a transcript: it has no cues`);
  return data as Transcript;
}

export interface TranscribeResult {
  transcript: Transcript;
  path: string;
  cached: boolean;
}

/** Transcribes a source (a file or an address), or reads the transcript already made with these options. */
export async function transcribe(source: Source, options: TranscribeOptions): Promise<TranscribeResult> {
  const dir = folderOf(source);
  const file = path.join(dir, transcriptName(options));
  if (existsSync(file)) return { transcript: readTranscript(file), path: file, cached: true };

  const media = await mediaFile(source, "audio");
  const python = await locate("python");
  if (!python) throw new Error("Python wasn't found");

  {
    let info: WhisperInfo | undefined;
    const cues: Cue[] = [];
    let failure: string | undefined;
    const said = await run(python, ["-c", WHISPER_SCRIPT, media, options.model, options.language ?? "", whisperDevice(), "int8", options.from !== undefined ? String(options.from) : "", options.to !== undefined ? String(options.to) : ""], {
      timeoutMs: 6 * 60 * 60_000,
      onLine: (line) => {
        const parsed = parseWhisperLine(line);
        if (!parsed) return;
        if ("info" in parsed) info = parsed.info;
        else if ("error" in parsed) failure = parsed.error;
        else if (parsed.cue.text) {
          cues.push(parsed.cue);
          if (info?.duration) options.onProgress?.(parsed.cue.end, info.duration);
        }
      },
    });
    if (said.code === NOT_INSTALLED) throw new Error(`${failure ?? "faster-whisper isn't installed"}: check_requirements says how to install it`);
    if (failure) throw new Error(`faster-whisper couldn't transcribe ${describe(source)}: ${failure}`);
    if (said.code !== 0) throw new Error(`faster-whisper couldn't transcribe ${describe(source)}${said.timedOut ? " (it took over 6 hours)" : ""}: ${whisperError(said.stderr)}`);

    const shift = options.from ?? 0;
    const transcript: Transcript = {
      source: describe(source),
      model: options.model,
      language: info?.language ?? options.language ?? "",
      languageProbability: options.language ? 1 : (info?.probability ?? 0),
      duration: info?.duration ?? 0,
      ...(options.from !== undefined ? { from: options.from } : {}),
      ...(options.to !== undefined ? { to: options.to } : {}),
      cues: cues.map((cue) => ({ start: round(cue.start + shift), end: round(cue.end + shift), text: cue.text })),
    };
    writeFileSync(file, `${JSON.stringify(transcript, null, 2)}\n`);
    return { transcript, path: file, cached: false };
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;
