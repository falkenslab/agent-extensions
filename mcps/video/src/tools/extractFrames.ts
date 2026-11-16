import { z } from "zod";
import { needs } from "../requirements.js";
import { extractFrames } from "../video/extract.js";
import { SUBTITLE_EXTENSIONS, describe, parseSource } from "../video/source.js";
import { reply } from "./reply.js";
import { sourceSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerExtractFrames: RegisterTool = (server) => {
  server.registerTool(
    "extract_frames",
    {
      title: "Take frames from a video",
      description:
        "Save frames of a video as JPEG files, each with its time, to look at what's on screen (slides, code, a program's windows, the board) and match it with the transcript by time. scenes mode (the default) takes one where the picture changes (a new slide, another window, code written) plus one at least every `every` seconds; interval mode takes one every `every` seconds. At most maxFrames, spread over the video: for a long video, ask for a stretch (from, to). Open each frame with your image reading tool. A YouTube or web address is downloaded first with yt-dlp (the picture only, up to 1080p). Needs ffmpeg. Writes only in the work folder, replacing the frames of an earlier call with the same mode and stretch.",
      inputSchema: {
        source: sourceSchema,
        mode: z.enum(["scenes", "interval"]).optional().describe("scenes (where the picture changes, the default) or interval (evenly)"),
        threshold: z.number().min(0.01).max(1).optional().describe("scenes: how much the picture must change, 0 to 1: 0.3 by default; 0.1 catches small changes like code typed, 0.5 only a new slide or shot"),
        every: z.number().min(1).max(3600).optional().describe("interval: seconds between frames (30 by default); scenes: the longest stretch without one (120 by default)"),
        maxFrames: z.number().int().min(1).max(200).optional().describe("The most to keep: 40 by default"),
        width: z.number().int().min(160).max(3840).optional().describe("The frames' width in pixels, never more than the video's: 1280 by default (enough to read code)"),
        from: z.number().min(0).optional().describe("Only from this second"),
        to: z.number().min(0).optional().describe("Only up to this second"),
      },
      outputSchema: {
        source: z.string(),
        folder: z.string(),
        mode: z.enum(["scenes", "interval"]),
        found: z.number().describe("How many frames ffmpeg found before keeping maxFrames"),
        frames: z.array(z.object({ time: z.number().describe("Seconds from the start"), at: z.string().describe("mm:ss, as transcripts show it"), path: z.string() })),
        notes: z.array(z.string()),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ source: given, mode = "scenes", threshold = 0.3, every, maxFrames = 40, width = 1280, from, to }) => {
      const source = parseSource(given);
      if (SUBTITLE_EXTENSIONS.includes(source.extension)) throw new Error(`${describe(source)} is a subtitle file, not a video`);
      if (from !== undefined && to !== undefined && to <= from) throw new Error("to must be after from");
      await needs("ffmpeg", ...(source.kind === "url" ? (["yt-dlp"] as const) : []));
      const options = { mode, threshold, every: every ?? (mode === "interval" ? 30 : 120), minGap: 2, width, ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}) };
      const result = await extractFrames(source, options, maxFrames);
      return reply({ source: describe(source), mode, ...result });
    },
  );
};
