import { readFileSync } from "node:fs";
import { z } from "zod";
import { defaultLanguage } from "../config.js";
import { needs } from "../requirements.js";
import { clock, parseSubtitles, transcriptPage, type Cue } from "../video/cues.js";
import { embeddedSubtitles, probe } from "../video/probe.js";
import { SUBTITLE_EXTENSIONS, describe, parseSource } from "../video/source.js";
import { chooseTrack, remoteCaptions, remoteInfo, type Track } from "../video/ytdlp.js";
import { reply } from "./reply.js";
import { languageSchema, pageInput, pageOutput, sourceSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

const KINDS = ["manual", "automatic", "translated", "file", "embedded"] as const;

/** A subtitle file at an address, fetched (at most 10 MB). */
async function fetchSubtitles(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
  } catch (error) {
    throw new Error(`${url} couldn't be fetched: ${(error as Error).message}`, { cause: error });
  }
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}${response.status === 401 || response.status === 403 ? ": it needs a sign-in (a Moodle file: download it with moodle-mcp's download_file and give its path)" : ""}`);
  const text = await response.text();
  if (text.length > 10 * 1024 * 1024) throw new Error(`${url} is over 10 MB: it isn't a subtitle file`);
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error(`${url} is a web page, not a subtitle file (a sign-in page?)`);
  return text;
}

export const registerGetCaptions: RegisterTool = (server) => {
  server.registerTool(
    "get_captions",
    {
      title: "Read a video's captions",
      description:
        "Read the captions a video already has, as a timed transcript ([mm:ss] text per paragraph): a YouTube video's (someone's own first, then YouTube's automatic ones, made from the speech, then a translation of those), a .vtt or .srt file or address, or a video file's own text subtitles. The first thing to try for what a video says: instant, nothing to install for a subtitle file. found false means it has none: then transcribe_video. Long transcripts come a page at a time (next). YouTube needs yt-dlp; a video file, ffmpeg. Only reads.",
      inputSchema: {
        source: sourceSchema.describe("The video, or its subtitle file: an absolute path on this computer, or an http(s) address (YouTube, another site yt-dlp reads, or a .vtt or .srt file)"),
        language: languageSchema.describe("The captions' language: es, en, pt-BR. By default the setting, else the video's own"),
        track: z.string().optional().describe("A YouTube track by its key, as get_video_info lists them (en, es-419, en-orig), instead of choosing by language"),
        stream: z.number().int().min(0).optional().describe("A video file's subtitle stream, by get_video_info's index, instead of choosing by language"),
        ...pageInput,
      },
      outputSchema: {
        found: z.boolean().describe("Whether it has captions; false: use transcribe_video"),
        source: z.string(),
        title: z.string().optional(),
        language: z.string().optional(),
        kind: z.enum(KINDS).optional().describe("manual: written by someone; automatic: YouTube's, made from the speech (no punctuation, names misheard); translated: YouTube's automatic ones machine-translated; file: a subtitle file; embedded: the video file's own"),
        available: z.object({ manual: z.array(z.string()), automatic: z.array(z.string()), translations: z.boolean() }).optional().describe("A YouTube video's tracks, to choose another with track"),
        cues: z.number().describe("How many captions there are"),
        until: z.string().optional().describe("Where the last caption ends, mm:ss"),
        ...pageOutput,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ source: given, language, track: trackKey, stream, offset = 0, maxChars = 40_000 }) => {
      const source = parseSource(given);
      const wanted = language ?? defaultLanguage();
      const answer = (cues: Cue[], extra: Record<string, unknown>) => {
        const page = transcriptPage(cues, offset, maxChars);
        const last = cues.at(-1);
        return reply({ found: cues.length > 0, source: describe(source), ...extra, cues: cues.length, ...(last ? { until: clock(last.end) } : {}), ...page });
      };

      if (SUBTITLE_EXTENSIONS.includes(source.extension)) {
        const text = source.kind === "file" ? readFileSync(source.path, "utf8") : await fetchSubtitles(source.url);
        const cues = parseSubtitles(text, source.extension);
        return answer(cues, { kind: "file" });
      }

      if (source.kind === "url") {
        await needs("yt-dlp");
        const info = await remoteInfo(source.url);
        const available = { manual: info.manual, automatic: info.automatic, translations: info.translations };
        let track: Track | undefined;
        if (trackKey) {
          const kind = info.manual.includes(trackKey) ? "manual" : info.automatic.includes(trackKey) ? "automatic" : info.allAutomatic.includes(trackKey) ? "translated" : undefined;
          if (!kind) throw new Error(`${source.url} has no captions track ${trackKey}: it has ${[...info.manual, ...info.automatic].join(", ") || "none"}`);
          track = { key: trackKey, language: trackKey.replace(/-orig$/, ""), kind };
        } else track = chooseTrack(info, wanted);
        const title = info.title ? { title: info.title } : {};
        if (!track) return answer([], { ...title, available });
        const cues = await remoteCaptions(source.url, track);
        return answer(cues, { ...title, language: track.language, kind: track.kind, available });
      }

      await needs("ffmpeg");
      const info = await probe(source.path);
      const readable = info.subtitles.filter((s) => s.text);
      const chosen =
        stream !== undefined
          ? info.subtitles.find((s) => s.index === stream)
          : ((wanted && readable.find((s) => s.language?.toLowerCase().startsWith(wanted.slice(0, 2).toLowerCase()))) || readable[0]);
      if (stream !== undefined && !chosen) throw new Error(`${source.path} has no subtitle stream ${stream}: get_video_info lists them`);
      if (chosen && !chosen.text) throw new Error(`Subtitle stream ${chosen.index} of ${source.path} is pictures (${chosen.codec}), not text: it can't be read; transcribe_video instead`);
      const title = info.title ? { title: info.title } : {};
      if (!chosen) return answer([], title);
      const cues = parseSubtitles(await embeddedSubtitles(source.path, chosen.index), ".vtt");
      return answer(cues, { ...title, ...(chosen.language ? { language: chosen.language } : {}), kind: "embedded" });
    },
  );
};

