import { z } from "zod";
import { defaultArea, outputDir, placesKey } from "../config.js";
import { dataDir } from "../dataDir.js";
import { readRecord, recordFile } from "../record/store.js";
import { REQUIREMENTS, checkRequirement } from "../requirements.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerServerInfo: RegisterTool = (server) => {
  server.registerTool(
    "server_info",
    {
      title: "Server info",
      description:
        "Show this server's version and settings: the default area, whether a Google Places key is set (never the key), where the record is and how many companies it holds, and the folder for drafts and exports. Useful when something fails or the person asks where their files are. Only reads.",
      inputSchema: {},
      outputSchema: {
        name: z.string(),
        version: z.string(),
        dataDir: z.string().describe("Where it keeps its state"),
        record: z.string().describe("The record's file"),
        companies: z.number().describe("Companies in the record"),
        outputDir: z.string().describe("Where drafts and exports go by default"),
        area: z.string().optional().describe("The default area searched"),
        placesKey: z.boolean().describe("Whether a Google Places key is set"),
        node: z.string(),
        requirements: z.array(z.object({ name: z.string(), ok: z.boolean(), problem: z.string().optional() })).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const requirements = await Promise.all(REQUIREMENTS.map(checkRequirement));
      const area = defaultArea();
      return reply({
        name: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        dataDir: dataDir(),
        record: recordFile(),
        companies: readRecord().companies.length,
        outputDir: outputDir(),
        ...(area ? { area } : {}),
        placesKey: !!placesKey(),
        node: process.version,
        ...(requirements.length ? { requirements: requirements.map(({ name, ok, problem }) => ({ name, ok, ...(problem ? { problem } : {}) })) } : {}),
      });
    },
  );
};
