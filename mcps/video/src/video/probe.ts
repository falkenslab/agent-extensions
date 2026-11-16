// ffprobe: what a video file on this computer holds (its length, picture, sound, subtitle tracks, chapters).
import { locate, run } from "../run.js";
import type { Chapter } from "./ytdlp.js";

export interface SubtitleStream {
  /** Its position among the file's subtitle streams, as ffmpeg's -map 0:s:<n> takes it. */
  index: number;
  language?: string;
  title?: string;
  codec: string;
  /** Whether it's text (subrip, mov_text, webvtt, ass), which can be read; a bitmap one (DVD, Blu-ray) can't. */
  text: boolean;
}

export interface LocalInfo {
  title?: string;
  duration?: number;
  width?: number;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  subtitles: SubtitleStream[];
  chapters: Chapter[];
}

const TEXT_CODECS = new Set(["subrip", "srt", "mov_text", "webvtt", "ass", "ssa", "text", "ttml"]);
const num = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

/** ffprobe's JSON (-show_format -show_streams -show_chapters), read. */
export function parseProbe(json: string): LocalInfo {
  let data: { format?: Record<string, unknown>; streams?: Record<string, unknown>[]; chapters?: Record<string, unknown>[] };
  try {
    data = JSON.parse(json) as typeof data;
  } catch {
    throw new Error("ffprobe didn't answer with the file's details");
  }
  const streams = data.streams ?? [];
  const tags = (o: Record<string, unknown> | undefined) => (o?.tags ?? {}) as Record<string, string>;
  // A cover image (an mp3's or m4a's) is a video stream too, but not a picture that moves.
  const video = streams.find((s) => s.codec_type === "video" && !(s.disposition as Record<string, number> | undefined)?.attached_pic);
  const subtitles = streams
    .filter((s) => s.codec_type === "subtitle")
    .map((s, index) => {
      const codec = String(s.codec_name ?? "unknown");
      const t = tags(s);
      return { index, codec, text: TEXT_CODECS.has(codec), ...(t.language && t.language !== "und" ? { language: t.language } : {}), ...(t.title ? { title: t.title } : {}) };
    });
  const chapters = (data.chapters ?? []).flatMap((c) => {
    const start = num(c.start_time);
    const end = num(c.end_time);
    return start === undefined ? [] : [{ start, ...(end !== undefined ? { end } : {}), title: tags(c).title ?? "" }];
  });
  const duration = num(data.format?.duration);
  const title = tags(data.format).title;
  const width = num(video?.width);
  const height = num(video?.height);
  return {
    ...(title ? { title } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    hasVideo: Boolean(video),
    hasAudio: streams.some((s) => s.codec_type === "audio"),
    subtitles,
    chapters,
  };
}

/** What a file holds, from ffprobe. */
export async function probe(file: string): Promise<LocalInfo> {
  const ffprobe = await locate("ffprobe");
  if (!ffprobe) throw new Error("ffprobe wasn't found");
  const said = await run(ffprobe, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", "-show_chapters", file], { timeoutMs: 60_000 });
  if (said.code !== 0) throw new Error(`ffprobe couldn't read ${file}: ${said.stderr.trim().slice(0, 300) || "it isn't a video or audio file"}`);
  return parseProbe(said.stdout);
}

/** A text subtitle stream of a file, as WebVTT, through ffmpeg's standard output. */
export async function embeddedSubtitles(file: string, stream: number): Promise<string> {
  const ffmpeg = await locate("ffmpeg");
  if (!ffmpeg) throw new Error("ffmpeg wasn't found");
  const said = await run(ffmpeg, ["-hide_banner", "-nostats", "-v", "error", "-i", file, "-map", `0:s:${stream}`, "-f", "webvtt", "-"], { timeoutMs: 120_000 });
  if (said.code !== 0) throw new Error(`ffmpeg couldn't read the subtitles of ${file}: ${said.stderr.trim().slice(0, 300)}`);
  return said.stdout;
}
