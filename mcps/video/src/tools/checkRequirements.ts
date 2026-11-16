import { z } from "zod";
import { checkRequirements } from "../requirements.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const requirementSchema = z.object({
  name: z.string(),
  program: z.string(),
  installed: z.boolean(),
  version: z.string().optional(),
  ok: z.boolean(),
  problem: z.string().optional(),
  install: z.string().optional().describe("How to install it on this system"),
  installBySystem: z.object({ windows: z.string().optional(), macos: z.string().optional(), linux: z.string().optional(), url: z.string().optional() }).describe("How to install it on each system"),
  for: z.string().describe("What needs it"),
  path: z.string().optional().describe("Where it was found"),
});

export const registerCheckRequirements: RegisterTool = (server) => {
  server.registerTool(
    "check_requirements",
    {
      title: "Check ffmpeg, faster-whisper and yt-dlp",
      description:
        "Check what this server uses that the person installs apart, each on its own: ffmpeg (with ffprobe; frames, and the audio to transcribe), Python with faster-whisper (transcribing), yt-dlp (YouTube and other sites). For each: found or not, its version, where, and how to install it on each system. Reading a .vtt or .srt needs none of them. If one was just installed, the app that runs this server may need restarting to see it. Never installs anything: tell the person what to do. Only reads.",
      inputSchema: {},
      outputSchema: {
        ok: z.boolean().describe("All three are there"),
        requirements: z.array(requirementSchema),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => reply({ ...(await checkRequirements()) }),
  );
};
