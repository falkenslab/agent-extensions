import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { workDir } from "../config.js";
import { describe, parseSource, slugOf } from "../video/source.js";
import { reply } from "./reply.js";
import { sourceSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

/** What a video's folder holds that can be made again: downloads (audio.*, video.*) and frames (frames-*). */
const regenerable = (name: string) => /^(audio|video)\./.test(name) || name.startsWith("frames-") || /\.(part|ytdl|temp)$/i.test(name) || /\.part-Frag/i.test(name);
const isTranscript = (name: string) => /^transcript-.*\.json$/.test(name);

/** A file's or a folder's size, in bytes. */
function sizeOf(target: string): number {
  const stat = statSync(target);
  if (!stat.isDirectory()) return stat.size;
  return readdirSync(target).reduce((total, name) => total + sizeOf(path.join(target, name)), 0);
}

export const registerCleanUpVideo: RegisterTool = (server) => {
  server.registerTool(
    "clean_up_video",
    {
      title: "Clean up a video's files",
      description:
        "Delete what this server kept in the work folder for one video once the work with it is done: the audio or picture downloaded from an address, and the frames extracted, all of which can be made again. Its transcripts stay (transcribing again is slow) unless transcripts is true. Never touches the video file itself when it's a file on this computer, nor a .vtt written with write_subtitles, nor anything outside the video's own folder in the work folder. Say what goes first; it's done for the person, at the end, as padawan's transcriber does.",
      inputSchema: {
        source: sourceSchema,
        transcripts: z.boolean().optional().describe("Delete its kept transcripts too (transcribing again is slow): only when the person no longer needs them"),
      },
      outputSchema: {
        source: z.string(),
        folder: z.string().describe("The video's folder in the work folder"),
        deleted: z.array(z.string()).describe("What was deleted, by name"),
        kept: z.array(z.string()).describe("What stays in its folder"),
        freedBytes: z.number().describe("The space freed, in bytes"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ source: given, transcripts = false }) => {
      const source = parseSource(given);
      const folder = path.join(workDir(), slugOf(source));
      if (!existsSync(folder)) return reply({ source: describe(source), folder, deleted: [], kept: [], freedBytes: 0 });
      const deleted: string[] = [];
      const kept: string[] = [];
      let freedBytes = 0;
      for (const name of readdirSync(folder).sort()) {
        const target = path.join(folder, name);
        if (regenerable(name) || (transcripts && isTranscript(name))) {
          freedBytes += sizeOf(target);
          rmSync(target, { recursive: true, force: true });
          deleted.push(name);
        } else kept.push(name);
      }
      if (!kept.length) rmSync(folder, { recursive: true, force: true });
      return reply({ source: describe(source), folder, deleted, kept, freedBytes });
    },
  );
};
