// yt-dlp: what it says about a video (-J), its captions tracks, and downloading its captions, audio or video.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { run, locate } from "../run.js";
import { parseVtt, type Cue } from "./cues.js";

export interface Chapter {
  start: number;
  end?: number;
  title: string;
}

/** What yt-dlp says about a video, the part this server uses. */
export interface RemoteInfo {
  id: string;
  title?: string;
  duration?: number;
  uploader?: string;
  /** The language YouTube says it's spoken in. */
  language?: string;
  chapters: Chapter[];
  /** Captions someone wrote, by language code. */
  manual: string[];
  /** Captions YouTube made from the speech, in the video's own language. */
  automatic: string[];
  /** Whether YouTube translates its automatic captions into other languages. */
  translations: boolean;
  /** The language codes of every automatic track, translations included. */
  allAutomatic: string[];
  width?: number;
  height?: number;
}

type Tracks = Record<string, { ext?: string; url?: string }[]>;

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);

/** yt-dlp's -J output, read. */
export function parseInfo(json: string): RemoteInfo {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("yt-dlp didn't answer with the video's details");
  }
  if (data._type === "playlist") throw new Error("that address is a playlist or a channel: give one video's address");
  const manualTracks = (data.subtitles ?? {}) as Tracks;
  const autoTracks = (data.automatic_captions ?? {}) as Tracks;
  const manual = Object.keys(manualTracks).filter((lang) => lang !== "live_chat" && manualTracks[lang]?.length);
  const allAutomatic = Object.keys(autoTracks).filter((lang) => autoTracks[lang]?.length);
  const language = str(data.language);
  const originals = allAutomatic.filter((lang) => lang.endsWith("-orig"));
  const automatic = originals.length ? originals : allAutomatic.filter((lang) => language && (lang === language || lang.split("-")[0] === language.split("-")[0]));
  const chapters = Array.isArray(data.chapters)
    ? (data.chapters as Record<string, unknown>[]).flatMap((c) => {
        const start = num(c.start_time);
        const end = num(c.end_time);
        return start === undefined ? [] : [{ start, ...(end !== undefined ? { end } : {}), title: str(c.title) ?? "" }];
      })
    : [];
  const width = num(data.width);
  const height = num(data.height);
  const duration = num(data.duration);
  return {
    id: str(data.id) ?? "",
    ...(str(data.title) ? { title: str(data.title) } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(str(data.uploader) ? { uploader: str(data.uploader) } : {}),
    ...(language ? { language } : {}),
    chapters,
    manual,
    automatic,
    translations: allAutomatic.length > automatic.length,
    allAutomatic,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
}

export type TrackKind = "manual" | "automatic" | "translated";

export interface Track {
  /** yt-dlp's key for it: en, es-419, en-orig. */
  key: string;
  /** Its language: en, es-419. */
  language: string;
  kind: TrackKind;
}

const base = (lang: string) => lang.replace(/-orig$/, "");
const sameLanguage = (lang: string, wanted: string) => {
  const [a, b] = [base(lang).toLowerCase(), wanted.toLowerCase()];
  return a === b || a.split("-")[0] === b || a === b.split("-")[0];
};

/**
 * The captions track to read: in the language asked for, someone's own first, then YouTube's automatic
 * ones, then a translation of those; with no language, the video's own (written, else automatic).
 */
export function chooseTrack(info: RemoteInfo, language?: string): Track | undefined {
  const pick = (key: string | undefined, kind: TrackKind): Track | undefined => (key ? { key, language: base(key), kind } : undefined);
  if (language) {
    return (
      pick(info.manual.find((l) => l.toLowerCase() === language.toLowerCase()) ?? info.manual.find((l) => sameLanguage(l, language)), "manual") ??
      pick(info.automatic.find((l) => sameLanguage(l, language)), "automatic") ??
      pick(info.allAutomatic.find((l) => !l.endsWith("-orig") && sameLanguage(l, language)), "translated")
    );
  }
  const own = info.language;
  return pick((own && info.manual.find((l) => sameLanguage(l, own))) || info.manual[0], "manual") ?? pick(info.automatic[0], "automatic");
}

async function ytDlp() {
  const command = await locate("yt-dlp");
  if (!command) throw new Error("yt-dlp wasn't found");
  return command;
}

/** What yt-dlp failed with, in one paragraph: its ERROR lines, else the end of what it said. */
export function ytDlpError(stderr: string, stdout = ""): string {
  const errors = stderr.split(/\r?\n/).filter((line) => line.startsWith("ERROR:"));
  return (errors.length ? errors.join(" ") : `${stderr}${stdout}`.trim().slice(-500)) || "no message";
}

/** What yt-dlp says about a video. */
export async function remoteInfo(url: string): Promise<RemoteInfo> {
  const said = await run(await ytDlp(), ["-J", "--no-playlist", "--skip-download", "--no-warnings", url], { timeoutMs: 120_000 });
  if (said.code !== 0) throw new Error(`yt-dlp couldn't read ${url}: ${ytDlpError(said.stderr, said.stdout)}`);
  return parseInfo(said.stdout);
}

/** A captions track's cues, downloaded by yt-dlp into a temporary folder and read. */
export async function remoteCaptions(url: string, track: Track): Promise<Cue[]> {
  const dir = mkdtempSync(path.join(tmpdir(), "video-mcp-"));
  try {
    const write = track.kind === "manual" ? "--write-subs" : "--write-auto-subs";
    const said = await run(await ytDlp(), ["--skip-download", "--no-playlist", "--no-warnings", write, "--sub-langs", track.key, "--sub-format", "vtt/best", "-o", path.join(dir, "captions.%(ext)s"), url], { timeoutMs: 120_000 });
    const file = readdirSync(dir).find((name) => name.startsWith("captions.") && name.endsWith(".vtt"));
    if (!file) throw new Error(`yt-dlp didn't get the ${track.key} captions of ${url}: ${said.code === 0 ? "it wrote no WebVTT file" : ytDlpError(said.stderr, said.stdout)}`);
    return parseVtt(readFileSync(path.join(dir, file), "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A downloaded file in a folder that starts with this name, if there's one (not a partial download). */
export function downloaded(dir: string, name: string): string | undefined {
  if (!existsSync(dir)) return undefined;
  const file = readdirSync(dir).find((f) => f.startsWith(`${name}.`) && !/\.(part|ytdl|temp|json)$/i.test(f) && !/\.part-Frag/i.test(f));
  return file ? path.join(dir, file) : undefined;
}

/** The formats asked of yt-dlp: the audio alone to transcribe, the picture alone (up to 1080p) to see. */
export const FORMATS = { audio: "bestaudio/best", video: "bv*[height<=1080]/b[height<=1080]/bv*/b" } as const;

/** Downloads a video's audio or picture into dir as <what>.<ext>, unless it's there already; returns the file. */
export async function download(url: string, dir: string, what: keyof typeof FORMATS): Promise<string> {
  const already = downloaded(dir, what);
  if (already) return already;
  const said = await run(await ytDlp(), ["--no-playlist", "--no-warnings", "--no-progress", "-f", FORMATS[what], "-o", path.join(dir, `${what}.%(ext)s`), url], { timeoutMs: 60 * 60_000 });
  const file = downloaded(dir, what);
  if (said.code !== 0 || !file) throw new Error(`yt-dlp couldn't download ${url}: ${ytDlpError(said.stderr, said.stdout)}`);
  return file;
}
