// A source's folder in the work folder, and its audio or picture as a file on this computer.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { workDir } from "../config.js";
import { slugOf, type Source } from "./source.js";
import { download } from "./ytdlp.js";

/** The source's own folder in the work folder, made if it isn't there. */
export function folderOf(source: Source): string {
  const dir = path.join(workDir(), slugOf(source));
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** A file to read the audio or the picture from: the file itself, or a download into the source's folder (kept for the next time). */
export async function mediaFile(source: Source, what: "audio" | "video"): Promise<string> {
  if (source.kind === "file") return source.path;
  return download(source.url, folderOf(source), what);
}
