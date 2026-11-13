import { z } from "zod";
import { TOPICS, reference } from "../asker/reference.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerAskerInputReference: RegisterTool = (server) => {
  server.registerTool(
    "asker_input_reference",
    {
      title: "Asker's input language",
      description:
        "Asker's input language in short, with an example of each element, for writing or fixing a definitions file: basics (%map, %concept, %names, %tags, %def and the spaces HAML needs), tables (one field, several, sequences), templates, files (images, audio, video), problems (cases, formulas, steps), code, and questions (what Asker makes from each, and their Moodle types). Read it before writing an input. Only reads.",
      inputSchema: { topics: z.array(z.enum(TOPICS)).optional().describe("Only these topics; all when not given") },
      outputSchema: { text: z.string().describe("The reference, as Markdown") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ topics }) => reply({ text: reference(topics) }),
  );
};
