import { z } from "zod";
import { defaultLanguage, whisperModel } from "../config.js";
import { needs } from "../requirements.js";
import { transcriptPage } from "../video/cues.js";
import { SUBTITLE_EXTENSIONS, describe, parseSource } from "../video/source.js";
import { transcribe } from "../video/transcribe.js";
import { reply } from "./reply.js";
import { languageSchema, pageInput, pageOutput, sourceSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerTranscribeVideo: RegisterTool = (server) => {
  server.registerTool(
    "transcribe_video",
    {
      title: "Transcribe a video",
      description:
        "Transcribe what's said in a video that has no captions, on this computer: ffmpeg takes the audio out and faster-whisper turns it into timed text (a YouTube or web address is downloaded first with yt-dlp, the audio only). Slow: about a third of the video's length with the default model on a laptop, more for bigger models; the first use of a model downloads it once. Try get_captions first. The transcript is kept as JSON in the work folder (transcript): calling again with the same options, for the next page (next), reads it instead of transcribing again, and write_subtitles turns it into a .vtt. Speech-to-text mishears names and technical terms: read it with that in mind. Needs ffmpeg and Python with faster-whisper, and yt-dlp for an address. Writes only in the work folder.",
      inputSchema: {
        source: sourceSchema,
        language: languageSchema.describe("The spoken language (es, en…): better and faster than detecting it. By default the setting, else detected"),
        model: z.string().regex(/^[\w.-]+$/).optional().describe("faster-whisper's model: tiny, base, small, medium, large-v3 or turbo; bigger is better and slower. By default the setting, else small"),
        from: z.number().min(0).optional().describe("Only from this second"),
        to: z.number().min(0).optional().describe("Only up to this second"),
        ...pageInput,
      },
      outputSchema: {
        source: z.string(),
        transcript: z.string().describe("The kept transcript (JSON with every cue): write_subtitles' from"),
        cached: z.boolean().describe("It was transcribed before with these options, and read back"),
        model: z.string(),
        language: z.string().describe("The language given, or the one detected"),
        languageProbability: z.number().describe("How sure the detection was, 0 to 1 (1 when the language was given); low means it may be the wrong language"),
        duration: z.number().describe("The audio's length transcribed, in seconds"),
        cues: z.number().describe("How many segments whisper gave"),
        ...pageOutput,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ source: given, language, model, from, to, offset = 0, maxChars = 40_000 }, extra) => {
      const source = parseSource(given);
      if (SUBTITLE_EXTENSIONS.includes(source.extension)) throw new Error(`${describe(source)} is a subtitle file: read it with get_captions`);
      if (from !== undefined && to !== undefined && to <= from) throw new Error("to must be after from");
      await needs("ffmpeg", "whisper", ...(source.kind === "url" ? (["yt-dlp"] as const) : []));
      const progressToken = extra._meta?.progressToken;
      let lastSent = 0;
      const { transcript, path, cached } = await transcribe(source, {
        model: model ?? whisperModel(),
        language: language ?? defaultLanguage(),
        ...(from !== undefined ? { from } : {}),
        ...(to !== undefined ? { to } : {}),
        onProgress: (done, total) => {
          if (progressToken === undefined || Date.now() - lastSent < 2000) return;
          lastSent = Date.now();
          void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: Math.round(done), total: Math.round(total), message: `Transcribed ${Math.round((100 * done) / total)}%` } }).catch(() => undefined);
        },
      });
      return reply({
        source: transcript.source,
        transcript: path,
        cached,
        model: transcript.model,
        language: transcript.language,
        languageProbability: Math.round(transcript.languageProbability * 100) / 100,
        duration: transcript.duration,
        cues: transcript.cues.length,
        ...transcriptPage(transcript.cues, offset, maxChars),
      });
    },
  );
};
