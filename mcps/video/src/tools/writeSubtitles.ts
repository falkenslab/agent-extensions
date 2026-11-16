import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { clock, parseSubtitles, type Cue } from "../video/cues.js";
import { readTranscript } from "../video/transcribe.js";
import { toVtt, vttTimestamp } from "../video/vtt.js";
import { reply } from "./reply.js";
import { absolutePath } from "./schemas.js";
import type { RegisterTool } from "./types.js";

const cueSchema = z.object({ start: z.number().min(0).describe("Seconds"), end: z.number().min(0).describe("Seconds"), text: z.string() });

/** The cues in a transcript JSON (transcribe_video's), a .vtt or an .srt file. */
function cuesFrom(file: string): Cue[] {
  if (!path.isAbsolute(file)) throw new Error(`${file}: give an absolute path`);
  if (!existsSync(file)) throw new Error(`${file}: there's no such file`);
  const extension = path.extname(file).toLowerCase();
  if (extension === ".json") return readTranscript(file).cues;
  if (extension === ".vtt" || extension === ".srt") return parseSubtitles(readFileSync(file, "utf8"), extension);
  throw new Error(`${file}: from takes transcribe_video's transcript (.json), a .vtt or an .srt file`);
}

export const registerWriteSubtitles: RegisterTool = (server) => {
  server.registerTool(
    "write_subtitles",
    {
      title: "Write subtitles",
      description:
        "Write a WebVTT subtitle file (.vtt), the format Moodle's media player and browsers take as a video's captions track, from transcribe_video's transcript (from), from a .srt or .vtt to convert or tidy, or from cues given here. It tidies them as subtitles: in order, never overlapping, at most two lines of 42 characters (longer cues split, their time shared), and makes the corrections given across every cue (a name or term the transcription misheard, as whole words). Read the transcript first and agree the corrections with the person. Writes one file: say where first; it overwrites only with overwrite true, with the person's yes.",
      inputSchema: {
        outputPath: absolutePath("The .vtt file to write (its folder is made if needed); usually beside the video, with its name"),
        from: absolutePath("transcribe_video's transcript (.json), or a .srt or .vtt file").optional(),
        cues: z.array(cueSchema).optional().describe("The cues themselves, instead of from: for a short video or one written by hand"),
        corrections: z.array(z.object({ from: z.string().min(1), to: z.string() })).optional().describe('Replace these words or phrases in every cue, as whole words, ignoring case: [{"from": "get hub", "to": "GitHub"}]'),
        maxLineLength: z.number().int().min(20).max(80).optional().describe("Characters per line, 42 by default"),
        maxLines: z.number().int().min(1).max(3).optional().describe("Lines per subtitle, 2 by default"),
        overwrite: z.boolean().optional().describe("Write over a file that's there: only with the person's yes"),
      },
      outputSchema: {
        path: z.string(),
        cues: z.number().describe("How many subtitles it has"),
        until: z.string().describe("Where the last one ends, mm:ss"),
        notes: z.array(z.string()).describe("What was changed to make them valid subtitles"),
        preview: z.string().describe("The first subtitles, as written"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ outputPath, from, cues: given, corrections, maxLineLength, maxLines, overwrite }) => {
      if (!path.isAbsolute(outputPath)) throw new Error(`${outputPath}: give an absolute path`);
      if (path.extname(outputPath).toLowerCase() !== ".vtt") throw new Error(`${outputPath}: the file must end in .vtt (WebVTT)`);
      if (Boolean(from) === Boolean(given)) throw new Error("Give either from (a transcript, .srt or .vtt file) or cues, not both or neither");
      if (existsSync(outputPath) && !overwrite) throw new Error(`${outputPath} is there already: choose another name, or overwrite: true with the person's yes`);
      const input = from ? cuesFrom(from) : (given ?? []);
      if (!input.length) throw new Error(`${from ?? "cues"}: there are no cues to write`);
      const { vtt, cues, notes } = toVtt(input, { ...(maxLineLength ? { maxLineLength } : {}), ...(maxLines ? { maxLines } : {}), ...(corrections ? { corrections } : {}) });
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, vtt);
      const preview = cues
        .slice(0, 3)
        .map((cue) => `${vttTimestamp(cue.start)} --> ${vttTimestamp(cue.end)}\n${cue.text}`)
        .join("\n\n");
      return reply({ path: outputPath, cues: cues.length, until: clock(cues.at(-1)?.end ?? 0), notes, preview });
    },
  );
};
