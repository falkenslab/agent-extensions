// Timed text: subtitle files (WebVTT, SRT) read into cues, and cues shown to a model as a transcript.

/** A stretch of speech: from start to end, in seconds. */
export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** 83.5 → "01:23", 3725 → "1:02:05": how a transcript shows a time. */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** "00:01:02.500", "01:02.500" or "00:01:02,500" (SRT) → 62.5; undefined when it isn't one. */
export function parseTimestamp(text: string): number | undefined {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(text.trim());
  if (!match) return undefined;
  const [, h = "0", m = "0", s = "0", ms = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", lrm: "", rlm: "" };

/** A cue's text as plain text: no tags (<c>, <v Name>, <i>, YouTube's word timings), entities decoded. */
export function plainText(text: string): string {
  return text
    .replace(/<\/?(?:c|i|b|u|v|lang|ruby|rt|font|span)\b[^>]*>|<\d[\d:.]*>/gi, "")
    .replace(/\{\\[^}]*\}/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, name: string) =>
      name.startsWith("#x") || name.startsWith("#X") ? String.fromCodePoint(Number.parseInt(name.slice(2), 16)) : name.startsWith("#") ? String.fromCodePoint(Number(name.slice(1))) : (ENTITIES[name.toLowerCase()] ?? whole),
    );
}

const ARROW = /^\s*(\S+)\s+-->\s+(\S+)/;

/** The cues of a subtitle file's blocks: a timing line, then its text up to a blank line. */
function readBlocks(text: string): Cue[] {
  const lines = text.trimStart().replace(/\r\n?/g, "\n").split("\n");
  const cues: Cue[] = [];
  for (let i = 0; i < lines.length; i++) {
    const timing = ARROW.exec(lines[i] ?? "");
    if (!timing) continue;
    const [start, end] = [parseTimestamp(timing[1] ?? ""), parseTimestamp(timing[2] ?? "")];
    const body: string[] = [];
    // Only an empty line ends a cue: YouTube's automatic captions have lines of one space inside theirs.
    while (i + 1 < lines.length && (lines[i + 1] ?? "") !== "" && !ARROW.test(lines[i + 1] ?? "")) body.push(lines[++i] ?? "");
    if (start === undefined || end === undefined) continue;
    cues.push({ start, end, text: body.join("\n") });
  }
  return cues;
}

/**
 * Cues as plain text, with YouTube's automatic captions made readable: each of their cues repeats the
 * line before it (a rolling caption), so a line that was just shown isn't shown again.
 */
export function cleanCues(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  let last: string[] = [];
  for (const cue of cues) {
    const lines = plainText(cue.text)
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    let fresh = lines;
    while (fresh.length && last.includes(fresh[0]!)) fresh = fresh.slice(1);
    if (lines.length) last = lines;
    if (!fresh.length) continue;
    out.push({ start: cue.start, end: Math.max(cue.end, cue.start), text: fresh.join("\n") });
  }
  return out;
}

/** A WebVTT file's cues (NOTE, STYLE and REGION blocks and cue settings ignored). */
export function parseVtt(text: string): Cue[] {
  if (!text.trimStart().startsWith("WEBVTT")) throw new Error("it isn't WebVTT: the file doesn't start with WEBVTT");
  return cleanCues(readBlocks(text));
}

/** An SRT file's cues. */
export function parseSrt(text: string): Cue[] {
  const cues = readBlocks(text);
  if (!cues.length && text.trim()) throw new Error("it isn't SRT: no line like 00:00:01,000 --> 00:00:04,000");
  return cleanCues(cues);
}

/** A subtitle file's cues, by its extension or, failing that, its first line. */
export function parseSubtitles(text: string, extension = ""): Cue[] {
  if (extension.toLowerCase() === ".vtt" || text.trimStart().startsWith("WEBVTT")) return parseVtt(text);
  return parseSrt(text);
}

/** Consecutive cues joined into readable paragraphs, each with the time it starts: what a model reads. */
export function paragraphs(cues: Cue[], maxChars = 400, maxGap = 3): Cue[] {
  const out: Cue[] = [];
  for (const cue of cues) {
    const text = cue.text.replace(/\s*\n\s*/g, " ").trim();
    const previous = out.at(-1);
    const sentenceDone = previous ? /[.!?…:]["')\]]?$/.test(previous.text) && previous.text.length >= maxChars / 2 : false;
    if (previous && cue.start - previous.end <= maxGap && previous.text.length + text.length < maxChars && !sentenceDone) {
      previous.text = `${previous.text} ${text}`;
      previous.end = Math.max(previous.end, cue.end);
    } else out.push({ start: cue.start, end: cue.end, text });
  }
  return out;
}

export interface TranscriptPage {
  /** The paragraphs as lines, "[mm:ss] text". */
  text: string;
  /** How many paragraphs there are in all. */
  paragraphs: number;
  /** The index of the first paragraph on this page. */
  offset: number;
  /** The offset of the next page, when there's more. */
  next?: number;
}

/** A page of a transcript, at most maxChars long, ending at a paragraph. */
export function transcriptPage(cues: Cue[], offset = 0, maxChars = 40_000): TranscriptPage {
  const all = paragraphs(cues);
  const lines: string[] = [];
  let size = 0;
  let i = offset;
  for (; i < all.length; i++) {
    const line = `[${clock(all[i]!.start)}] ${all[i]!.text}`;
    if (lines.length && size + line.length + 1 > maxChars) break;
    lines.push(line);
    size += line.length + 1;
  }
  return { text: lines.join("\n"), paragraphs: all.length, offset, ...(i < all.length ? { next: i } : {}) };
}
