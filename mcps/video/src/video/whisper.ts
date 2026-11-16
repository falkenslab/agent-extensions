// faster-whisper, a Python library: run with `python -c SCRIPT`, which prints one JSON line per segment,
// so the server reads the transcript as it comes and reports progress. Nothing is installed: when the
// library isn't there, the script says so and stops.
import type { Cue } from "./cues.js";

/** What the script prints first: what faster-whisper found about the audio. */
export interface WhisperInfo {
  language: string;
  probability: number;
  duration: number;
}

/**
 * The script. Its arguments: the video or audio file, the model, the language ("" detects it), the device,
 * the compute type, and the stretch (from and to, in seconds; "" for the start or the end). faster-whisper
 * reads the file itself through PyAV, which it brings, so no ffmpeg is needed (as padawan transcribes). VAD
 * skips silences, which is where whisper makes things up.
 */
export const WHISPER_SCRIPT = [
  "import json, sys",
  "media, model_name, language, device, compute_type, start, end = sys.argv[1:8]",
  "try:",
  "    from faster_whisper import WhisperModel, decode_audio",
  "except ImportError:",
  "    print(json.dumps({'error': 'faster-whisper is not installed for this Python'}), flush=True)",
  "    sys.exit(3)",
  "try:",
  "    audio = decode_audio(media, sampling_rate=16000)",
  "except Exception as e:",
  "    print(json.dumps({'error': 'the file has no sound that can be read: ' + str(e)[:200]}), flush=True)",
  "    sys.exit(4)",
  "if start or end:",
  "    audio = audio[int(float(start or 0) * 16000):(int(float(end) * 16000) if end else None)]",
  "model = WhisperModel(model_name, device=device, compute_type=compute_type)",
  "segments, info = model.transcribe(audio, language=language or None, vad_filter=True, beam_size=5)",
  "print(json.dumps({'info': {'language': info.language, 'probability': info.language_probability, 'duration': info.duration}}), flush=True)",
  "for s in segments:",
  "    print(json.dumps({'start': s.start, 'end': s.end, 'text': s.text}), flush=True)",
].join("\n");

/** The exit code when faster-whisper isn't installed. */
export const NOT_INSTALLED = 3;

export type WhisperLine = { info: WhisperInfo } | { cue: Cue } | { error: string } | undefined;

/** One line of the script's output; undefined for anything else (a library's message). */
export function parseWhisperLine(line: string): WhisperLine {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (!data || typeof data !== "object") return undefined;
  if (typeof data.error === "string") return { error: data.error };
  if (data.info && typeof data.info === "object") {
    const info = data.info as Record<string, unknown>;
    return { info: { language: String(info.language ?? ""), probability: Number(info.probability ?? 0), duration: Number(info.duration ?? 0) } };
  }
  if (typeof data.start === "number" && typeof data.end === "number" && typeof data.text === "string") return { cue: { start: data.start, end: data.end, text: data.text.trim() } };
  return undefined;
}

/** The whole output read: the info and the cues, in order. */
export function parseWhisperOutput(stdout: string): { info?: WhisperInfo; cues: Cue[]; error?: string } {
  const out: { info?: WhisperInfo; cues: Cue[]; error?: string } = { cues: [] };
  for (const line of stdout.split(/\r?\n/)) {
    const parsed = parseWhisperLine(line);
    if (!parsed) continue;
    if ("info" in parsed) out.info = parsed.info;
    else if ("cue" in parsed) {
      if (parsed.cue.text) out.cues.push(parsed.cue);
    } else out.error = parsed.error;
  }
  return out;
}

/** What went wrong in Python, in a sentence: its last error line, and what usually causes it. */
export function whisperError(stderr: string): string {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = [...lines].reverse().find((l) => /error|exception/i.test(l)) ?? lines.at(-1) ?? "no message";
  if (/HfHub|huggingface|ConnectionError|getaddrinfo|Max retries|offline/i.test(stderr)) return `${last} (the model is downloaded the first time it's used: this computer needs the internet once for each model size)`;
  if (/cuda|cudnn|cublas/i.test(stderr)) return `${last} (the GPU couldn't be used: set the whisper device to cpu)`;
  if (/Invalid model size|model.*not found/i.test(stderr)) return `${last} (use a model size: tiny, base, small, medium, large-v3 or turbo)`;
  return last.slice(0, 500);
}
