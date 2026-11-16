// What a tool is given: a file on this computer or an address (YouTube, another site yt-dlp reads, or a
// subtitle file), and the folder in the work folder where what's made from it goes.
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

export const SUBTITLE_EXTENSIONS = [".vtt", ".srt"];

export type Source = { kind: "file"; path: string; extension: string } | { kind: "url"; url: string; youtubeId?: string; extension: string };

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtube-nocookie.com", "youtube-nocookie.com"]);

/** A YouTube video's id from its address (watch, youtu.be, embed, shorts, live), or undefined. */
export function youtubeId(address: string): string | undefined {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return undefined;
  const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0] : (url.searchParams.get("v") ?? /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(url.pathname)?.[1]);
  return id && /^[\w-]{6,20}$/.test(id) ? id : undefined;
}

/** What the source is, or an error saying what's wrong with it. */
export function parseSource(source: string): Source {
  const text = source.trim();
  if (/^https?:\/\//i.test(text)) {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      throw new Error(`${text} isn't a valid address`);
    }
    const id = youtubeId(text);
    return { kind: "url", url: url.href, ...(id ? { youtubeId: id } : {}), extension: path.extname(url.pathname).toLowerCase() };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) throw new Error(`${text}: only http and https addresses, or a file on this computer`);
  if (!path.isAbsolute(text)) throw new Error(`${text}: give an absolute path on this computer, or an http(s) address`);
  if (!existsSync(text)) throw new Error(`${text}: there's no such file`);
  if (!statSync(text).isFile()) throw new Error(`${text} is a folder: give a file`);
  return { kind: "file", path: text, extension: path.extname(text).toLowerCase() };
}

/** The folder's name for a source in the work folder: youtube-<id>, or a file's name with a short hash. */
export function slugOf(source: Source): string {
  const hash = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 8);
  if (source.kind === "url") {
    if (source.youtubeId) return `youtube-${source.youtubeId}`;
    const url = new URL(source.url);
    return `${clean(`${url.hostname}-${path.basename(url.pathname, path.extname(url.pathname))}`)}-${hash(source.url)}`;
  }
  return `${clean(path.basename(source.path, path.extname(source.path)))}-${hash(path.resolve(source.path).toLowerCase())}`;
}

function clean(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 50) || "video"
  );
}

/** What a tool says about an address it can't take. */
export function describe(source: Source): string {
  return source.kind === "file" ? source.path : source.url;
}
