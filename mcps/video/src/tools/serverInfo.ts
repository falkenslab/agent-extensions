import { z } from "zod";
import { defaultLanguage, whisperDevice, whisperModel, workDir } from "../config.js";
import { checkRequirements } from "../requirements.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerServerInfo: RegisterTool = (server) => {
  server.registerTool(
    "server_info",
    {
      title: "Server info",
      description:
        "Show this server's name and version, Node's, its settings (the work folder where downloads, transcripts and frames go, the whisper model, the default language, the device) and whether ffmpeg, faster-whisper and yt-dlp are there, useful when something fails. Contains no secrets. Only reads.",
      inputSchema: {},
      outputSchema: {
        name: z.string(),
        version: z.string(),
        node: z.string(),
        workFolder: z.string().describe("Where downloads, transcripts and frames are kept, a folder per video"),
        whisperModel: z.string(),
        language: z.string().describe("The default language, or auto"),
        whisperDevice: z.string(),
        requirements: z.array(z.object({ name: z.string(), ok: z.boolean(), version: z.string().optional(), path: z.string().optional(), problem: z.string().optional() })),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const { requirements } = await checkRequirements();
      return reply({
        name: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        node: process.version,
        workFolder: workDir(),
        whisperModel: whisperModel(),
        language: defaultLanguage() ?? "auto",
        whisperDevice: whisperDevice(),
        requirements: requirements.map(({ name, ok, version, path, problem }) => ({ name, ok, ...(version ? { version } : {}), ...(path ? { path } : {}), ...(problem ? { problem } : {}) })),
      });
    },
  );
};
