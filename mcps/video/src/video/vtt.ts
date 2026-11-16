// Writing WebVTT: cues tidied into subtitles a player shows well (two short lines, a few seconds each,
// in order and never overlapping), which Moodle's media player and browsers take as a captions track.
import type { Cue } from "./cues.js";

export interface SubtitleOptions {
  /** The longest line, in characters: 42 by default, the usual broadcast limit. */
  maxLineLength?: number;
  /** Lines per subtitle: 2 by default. */
  maxLines?: number;
  /** The shortest a subtitle stays on screen, in seconds. */
  minDuration?: number;
  /** Words or phrases to put right in every cue (a name the transcription misheard). */
  corrections?: { from: string; to: string }[];
}

export interface Subtitles {
  vtt: string;
  cues: Cue[];
  /** What was changed to make them valid, said once each. */
  notes: string[];
}

/** "00:01:02.500": WebVTT's timestamp, always with hours. */
export function vttTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const [h, m, s, rest] = [Math.floor(ms / 3_600_000), Math.floor((ms % 3_600_000) / 60_000), Math.floor((ms % 60_000) / 1000), ms % 1000];
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(h)}:${two(m)}:${two(s)}.${String(rest).padStart(3, "0")}`;
}

/** A cue's text made safe for WebVTT: & < > escaped, so no tag and no --> is left in it. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text with each correction made, as whole words, ignoring case. */
export function correct(text: string, corrections: { from: string; to: string }[] = []): string {
  let out = text;
  for (const { from, to } of corrections) {
    if (!from.trim()) continue;
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(from.trim())}(?![\\p{L}\\p{N}])`, "giu"), to);
  }
  return out;
}

/** Words wrapped into lines of at most `width` characters (a longer word stays whole). */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Two lines about the same length, rather than a full one and a word: easier to read. */
export function balance(text: string, width: number): string[] {
  const lines = wrap(text, width);
  if (lines.length !== 2) return lines;
  const words = text.split(/\s+/).filter(Boolean);
  let best = lines;
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    if (pair[0]!.length > width || pair[1]!.length > width) continue;
    if (Math.max(pair[0]!.length, pair[1]!.length) < Math.max(best[0]!.length, best[1]!.length)) best = pair;
  }
  return best;
}

/** Splits a long cue into several that each fit, sharing its time by their length. */
function split(cue: Cue, width: number, maxLines: number): Cue[] {
  const lines = wrap(cue.text, width);
  if (lines.length <= maxLines) return [{ ...cue, text: balance(cue.text, width).join("\n") }];
  // Balance the chunks: as many as needed, about the same size each.
  const chunks = Math.ceil(lines.length / maxLines);
  const words = cue.text.split(/\s+/).filter(Boolean);
  const per = Math.ceil(words.length / chunks);
  const parts: string[] = [];
  for (let i = 0; i < words.length; i += per) parts.push(words.slice(i, i + per).join(" "));
  const total = parts.reduce((sum, part) => sum + part.length, 0) || 1;
  const out: Cue[] = [];
  let at = cue.start;
  for (const part of parts) {
    const end = at + ((cue.end - cue.start) * part.length) / total;
    out.push({ start: at, end, text: balance(part, width).join("\n") });
    at = end;
  }
  return out;
}

/** WebVTT for these cues, tidied: sorted, empty ones dropped, overlaps cut, long ones split, corrections made. */
export function toVtt(input: Cue[], options: SubtitleOptions = {}): Subtitles {
  const { maxLineLength = 42, maxLines = 2, minDuration = 0.5, corrections } = options;
  const notes = new Set<string>();
  const valid = input.filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0);
  if (valid.length < input.length) notes.add(`${input.length - valid.length} cues without a valid time were left out`);
  const sorted = [...valid].sort((a, b) => a.start - b.start);
  if (sorted.some((cue, i) => cue !== valid[i])) notes.add("the cues were put in order of time");
  const cleaned: Cue[] = [];
  for (const cue of sorted) {
    const text = correct(cue.text.replace(/<\/?(?:c|i|b|u|v|lang|ruby|rt)\b[^>]*>|<\d[\d:.]*>/g, "").replace(/\s+/g, " ").trim(), corrections);
    if (!text) {
      notes.add("empty cues were left out");
      continue;
    }
    let end = cue.end;
    if (end - cue.start < minDuration) {
      end = cue.start + minDuration;
      notes.add(`cues shorter than ${minDuration} s were lengthened`);
    }
    cleaned.push({ start: cue.start, end, text });
  }
  for (let i = 0; i + 1 < cleaned.length; i++) {
    const [cue, next] = [cleaned[i]!, cleaned[i + 1]!];
    if (cue.end > next.start) {
      cue.end = Math.max(cue.start + 0.01, next.start);
      notes.add("overlapping cues were cut where the next one starts");
    }
  }
  const cues = cleaned.flatMap((cue) => {
    const parts = split(cue, maxLineLength, maxLines);
    if (parts.length > 1) notes.add(`long cues were split to fit ${maxLines} lines of ${maxLineLength} characters`);
    return parts;
  });
  const blocks = cues.map((cue, i) => `${i + 1}\n${vttTimestamp(cue.start)} --> ${vttTimestamp(cue.end)}\n${cue.text.split("\n").map(escape).join("\n")}`);
  return { vtt: `WEBVTT\n\n${blocks.join("\n\n")}\n`, cues, notes: [...notes] };
}
