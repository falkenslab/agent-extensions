import { z } from "zod";
import { checkRequirements } from "../requirements.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerServerInfo: RegisterTool = (server) => {
  server.registerTool(
    "server_info",
    {
      title: "Server info",
      description: "Show this server's name and version, Node's, and whether Ruby and Asker are there (with the Ruby it uses), useful when something fails. Contains no secrets. Only reads.",
      inputSchema: {},
      outputSchema: {
        name: z.string(),
        version: z.string(),
        node: z.string(),
        ruby: z.string().optional().describe("The Ruby it runs Asker with"),
        requirements: z.array(z.object({ name: z.string(), ok: z.boolean(), version: z.string().optional(), problem: z.string().optional() })),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const { requirements, ruby } = await checkRequirements();
      return reply({
        name: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        node: process.version,
        ...(ruby ? { ruby: ruby.ruby } : {}),
        requirements: requirements.map(({ name, ok, version, problem }) => ({ name, ok, ...(version ? { version } : {}), ...(problem ? { problem } : {}) })),
      });
    },
  );
};
