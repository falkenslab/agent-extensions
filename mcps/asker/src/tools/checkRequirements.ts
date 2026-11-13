import { z } from "zod";
import { checkRequirements } from "../requirements.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerCheckRequirements: RegisterTool = (server) => {
  server.registerTool(
    "check_requirements",
    {
      title: "Check Ruby and Asker",
      description:
        "Check what this server needs installed apart on the person's computer: Ruby (3.0 or later) and the asker-tool gem (Asker 2.10 or later), their versions, and, when one is missing or too old, how to install it on this system. If they were just installed, the app that runs this server may need restarting to see them. Never installs anything: tell the person what to do. Only reads.",
      inputSchema: {},
      outputSchema: {
        ok: z.boolean().describe("Ruby and Asker are both there"),
        requirements: z.array(
          z.object({ name: z.string(), program: z.string(), installed: z.boolean(), version: z.string().optional(), ok: z.boolean(), problem: z.string().optional(), install: z.string().optional() }),
        ),
        ruby: z.string().optional().describe("The Ruby used"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const { ok, requirements, ruby } = await checkRequirements();
      return reply({ ok, requirements, ...(ruby ? { ruby: ruby.ruby } : {}) });
    },
  );
};
