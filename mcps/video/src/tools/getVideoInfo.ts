import { z } from "zod";
import { clock } from "../video/cues.js";
import { probe } from "../video/probe.js";
import { SUBTITLE_EXTENSIONS, describe, parseSource } from "../video/source.js";
import { remoteInfo } from "../video/ytdlp.js";
import { needs } from "../requirements.js";
import { reply } from "./reply.js";
import { chapterSchema, sourceSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerGetVideoInfo: RegisterTool = (server) => {
  server.registerTool(
    "get_video_info",
    {
      title: "Video details",
      description:
        "What a video is before working on it: its title, length, picture size, whether it has sound, its chapters, and the captions it already has (YouTube's written and automatic tracks by language, or a file's own subtitle streams). hasCaptions false is a video without subtitles. Use it to decide: captions there → get_captions; none → transcribe_video. A YouTube or web address needs yt-dlp; a file, ffmpeg's ffprobe. Downloads nothing. Only reads.",
      inputSchema: { source: sourceSchema },
      outputSchema: {
        source: z.string(),
        kind: z.enum(["youtube", "web", "file"]),
        title: z.string().optional(),
        duration: z.number().optional().describe("Seconds"),
        length: z.string().optional().describe("The duration as mm:ss or h:mm:ss"),
        width: z.number().optional(),
        height: z.number().optional(),
        hasVideo: z.boolean().optional().describe("A file: whether it has a picture (an audio file doesn't)"),
        hasAudio: z.boolean().optional().describe("A file: whether it has sound"),
        language: z.string().optional().describe("The language the site says it's spoken in"),
        hasCaptions: z.boolean().describe("Whether it has captions get_captions can read"),
        captions: z.object({
          manual: z.array(z.string()).describe("Languages of captions someone wrote"),
          automatic: z.array(z.string()).describe("Languages of YouTube's automatic captions (made from the speech), keys as get_captions' track takes them"),
          translations: z.boolean().describe("YouTube also translates its automatic captions into other languages"),
          embedded: z.array(z.object({ index: z.number(), language: z.string().optional(), title: z.string().optional(), codec: z.string(), text: z.boolean() })).describe("A file's own subtitle streams; text false is a picture-based one, which can't be read"),
        }),
        chapters: z.array(chapterSchema),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ source: given }) => {
      const source = parseSource(given);
      if (SUBTITLE_EXTENSIONS.includes(source.extension)) throw new Error(`${describe(source)} is a subtitle file, not a video: read it with get_captions`);
      if (source.kind === "url") {
        await needs("yt-dlp");
        const info = await remoteInfo(source.url);
        return reply({
          source: source.url,
          kind: source.youtubeId ? ("youtube" as const) : ("web" as const),
          ...(info.title ? { title: info.title } : {}),
          ...(info.duration !== undefined ? { duration: info.duration, length: clock(info.duration) } : {}),
          ...(info.width !== undefined ? { width: info.width } : {}),
          ...(info.height !== undefined ? { height: info.height } : {}),
          ...(info.language ? { language: info.language } : {}),
          hasCaptions: info.manual.length + info.automatic.length > 0,
          captions: { manual: info.manual, automatic: info.automatic, translations: info.translations, embedded: [] },
          chapters: info.chapters.map((c) => ({ start: c.start, at: clock(c.start), title: c.title })),
        });
      }
      await needs("ffmpeg");
      const info = await probe(source.path);
      return reply({
        source: source.path,
        kind: "file" as const,
        ...(info.title ? { title: info.title } : {}),
        ...(info.duration !== undefined ? { duration: info.duration, length: clock(info.duration) } : {}),
        ...(info.width !== undefined ? { width: info.width } : {}),
        ...(info.height !== undefined ? { height: info.height } : {}),
        hasVideo: info.hasVideo,
        hasAudio: info.hasAudio,
        hasCaptions: info.subtitles.some((s) => s.text),
        captions: { manual: [], automatic: [], translations: false, embedded: info.subtitles },
        chapters: info.chapters.map((c) => ({ start: c.start, at: clock(c.start), title: c.title })),
      });
    },
  );
};
