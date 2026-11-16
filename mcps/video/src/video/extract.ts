// Extracting frames into the source's folder: ffmpeg writes them, the server keeps at most maxFrames
// spread over the video, and names each with its time.
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { locate, run } from "../run.js";
import { clock } from "./cues.js";
import { frameArgs, frameName, parseShowinfo, spread, type FrameOptions } from "./frames.js";
import { folderOf, mediaFile } from "./media.js";
import { describe, type Source } from "./source.js";

export interface Frame {
  /** Seconds from the start of the video. */
  time: number;
  /** The same time as mm:ss, as transcripts show it. */
  at: string;
  path: string;
}

export interface FramesResult {
  folder: string;
  /** How many ffmpeg found before keeping at most maxFrames. */
  found: number;
  frames: Frame[];
  notes: string[];
}

/** The frames' folder for these options: one per mode and stretch, emptied before each run. */
export function framesFolderName(options: FrameOptions): string {
  const part = options.from !== undefined || options.to !== undefined ? `-${options.from ?? 0}-${options.to ?? "end"}` : "";
  return `frames-${options.mode}${part}`;
}

export async function extractFrames(source: Source, options: FrameOptions, maxFrames: number): Promise<FramesResult> {
  const media = await mediaFile(source, "video");
  const ffmpeg = await locate("ffmpeg");
  if (!ffmpeg) throw new Error("ffmpeg wasn't found");
  const folder = path.join(folderOf(source), framesFolderName(options));
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });

  const said = await run(ffmpeg, frameArgs(media, path.join(folder, "raw-%05d.jpg"), options), { timeoutMs: 2 * 60 * 60_000 });
  const raw = readdirSync(folder).filter((f) => /^raw-\d+\.jpg$/.test(f)).sort();
  if (said.code !== 0 || !raw.length) {
    const message = said.stderr.split(/\r?\n/).filter((l) => !/Parsed_showinfo|^\s/.test(l) && l.trim()).slice(-3).join(" ");
    throw new Error(`ffmpeg couldn't take frames from ${describe(source)}: ${/matches no streams|does not contain any stream/i.test(said.stderr) ? "it has no picture" : message.slice(0, 400) || "no message"}`);
  }
  const shift = options.from ?? 0;
  const times = parseShowinfo(said.stderr);
  const notes: string[] = [];
  if (times.length !== raw.length) notes.push("some frames' times couldn't be read: those show an estimate");
  const keep = new Set(spread(raw.length, maxFrames));
  if (keep.size < raw.length) notes.push(`${raw.length} frames were found; ${keep.size} were kept, spread over the video: ask for a stretch (from, to) or a higher threshold to see more of one part`);
  const frames: Frame[] = [];
  raw.forEach((file, i) => {
    const from = path.join(folder, file);
    if (!keep.has(i)) {
      rmSync(from, { force: true });
      return;
    }
    const time = Math.round(((times[i] ?? (times.at(-1) ?? 0)) + shift) * 1000) / 1000;
    const to = path.join(folder, frameName(frames.length, time));
    renameSync(from, to);
    frames.push({ time, at: clock(time), path: to });
  });
  if (options.mode === "scenes" && frames.length === 1) notes.push("the picture hardly changes: lower the threshold, or use interval mode, to see more");
  return { folder, found: raw.length, frames, notes };
}
