import { z } from "zod";
import { checkInput, inputProblem } from "../asker/generate.js";
import { needsAsker } from "../requirements.js";
import { reply } from "./reply.js";
import { absolutePath, groupSchema, hintSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerCheckInput: RegisterTool = (server) => {
  server.registerTool(
    "check_input",
    {
      title: "Check an Asker input",
      description:
        "Check an Asker definitions file (.haml or .xml) without writing anything the person keeps: hints found before Asker runs, each with its line (invisible characters, tabs, odd indentation, an empty %def, files and links that won't load, a %map without lang, XML that isn't well formed), Asker's syntax check (HAML), then a trial run in a temporary folder that gives the errors and warnings Asker shows loading it, Asker's messages in plain words, how many questions it would make per concept, problem or code file, and which would make none. Asker also reads the other .haml and .xml files in the same folder (alsoRead), whose concepts give it wrong answers; a file there that isn't an Asker input (a Moodle XML, say) would stop it, and is said. Run it after writing or changing an input, and fix what it says before generate_questions. Only reads.",
      inputSchema: { path: absolutePath("The input file, .haml or .xml") },
      outputSchema: {
        ok: z.boolean().describe("Asker reads it and makes questions, with no errors"),
        syntax: z
          .object({
            ok: z.boolean(),
            errors: z.array(z.object({ line: z.number(), message: z.string(), source: z.string() })),
            total: z.number().optional().describe("How many errors in all: Asker shows at most 10"),
          })
          .optional()
          .describe("asker check's verdict (HAML only), each complaint with its line; it also flags lines Asker ignores while loading, so ok says whether Asker reads the file, and these still need fixing"),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
        wouldGenerate: z.object({ total: z.number(), groups: z.array(groupSchema) }).optional().describe("What generate_questions would make, with every question type"),
        withoutQuestions: z.array(z.string()).describe("Concepts, problems or code files that would give no question; Asker shortens long names"),
        alsoRead: z.array(z.string()).describe("The other inputs in its folder, which Asker reads too"),
        hints: z.array(hintSchema).describe("What stands out in the file, with its line, found before Asker runs: invisible characters, tabs, odd indentation, empty definitions, files and links that won't load, a %map without lang, XML that isn't well formed"),
        explained: z.array(z.string()).describe("Asker's messages in plain words, where they're known"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path }) => {
      const problem = inputProblem(path);
      if (problem) throw new Error(problem);
      await needsAsker();
      return reply({ ...(await checkInput(path)) });
    },
  );
};
