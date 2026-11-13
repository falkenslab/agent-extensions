import { z } from "zod";
import { STAGE_NAMES, iniProblem } from "../asker/config.js";
import { generate } from "../asker/generate.js";
import { needsAsker } from "../requirements.js";
import { reply } from "./reply.js";
import { absolutePath, countsSchema, groupSchema, hintSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerGenerateQuestions: RegisterTool = (server) => {
  server.registerTool(
    "generate_questions",
    {
      title: "Generate questions with Asker",
      description:
        "Run Asker on one or more definitions files (or a folder of them) and write its questions into a folder on this computer: Moodle XML (the complete output, for moodle-teacher's import), and on request GIFT and Asker's review sheet. Asker writes each question from the file as it is, choosing them at random, so each run differs; the server never rewrites one. It never looks anything up on the internet. Drag-and-drop matching (a Moodle plugin) is left out unless asked for. Writes files: say where first, and only overwrite with the person's yes. Returns each file's path and the counts per concept, problem or code file; read them with read_questions before anything is imported.",
      inputSchema: {
        inputs: z.array(absolutePath("An input file (.haml or .xml) or a folder of them")).min(1),
        outputDir: absolutePath("The folder to write into, made if it isn't there; not an input's own folder (Asker reads every .xml there, and would take the Moodle XML for an input): a subfolder such as questions/ is fine"),
        formats: z.array(z.enum(["moodle", "gift", "doc"])).optional().describe("moodle (Moodle XML, the default and the complete one), gift, doc (Asker's review sheet, a .txt)"),
        stages: z.array(z.enum(STAGE_NAMES)).optional().describe("Only these question types for concepts; all when not given. Problems and code aren't affected"),
        category: z.string().optional().describe('The question bank category to import into, as a path under the course: "Unit 3/Bands"'),
        penalties: z.boolean().optional().describe("Wrong multiple-choice answers take points off (Asker's default, true) or not (false)"),
        exclude: z.array(z.string().min(1)).optional().describe('Leave out questions whose name contains any of these texts, as Asker\'s exclude does: "misspelled" drops the misspelled-word questions, "hidden" those with hidden letters'),
        ddmatch: z.boolean().optional().describe("Keep drag-and-drop matching questions (ddmatch): only for a Moodle with that plugin; GIFT can't hold them"),
        overwrite: z.boolean().optional().describe("Write over files that are there already: only with the person's yes"),
      },
      outputSchema: {
        results: z.array(
          z.object({
            input: z.string(),
            ok: z.boolean(),
            files: z.object({ moodle: z.string().optional(), gift: z.string().optional(), doc: z.string().optional() }),
            counts: z.object(countsSchema).optional(),
            groups: z.array(groupSchema).optional(),
            excludedByAsker: z.number().describe("Questions Asker left out by name (exclude, and drag-and-drop matching)"),
            errors: z.array(z.string()),
            warnings: z.array(z.string()),
            notes: z.array(z.string()),
            hints: z.array(hintSchema).optional().describe("When Asker couldn't read it: what stands out in the file, with its line"),
            explained: z.array(z.string()).optional().describe("Asker's messages in plain words"),
          }),
        ),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ inputs, outputDir, formats, stages, category, penalties, exclude, ddmatch, overwrite }) => {
      if (category !== undefined) {
        const problem = iniProblem(category);
        if (problem) throw new Error(`The category ${problem}`);
      }
      await needsAsker();
      const results = await generate({
        inputs,
        outputDir,
        formats: formats ?? ["moodle"],
        ...(stages ? { stages } : {}),
        ...(category ? { category } : {}),
        ...(penalties !== undefined ? { penalties } : {}),
        ...(exclude ? { exclude } : {}),
        ddmatch: ddmatch ?? false,
        overwrite: overwrite ?? false,
      });
      return reply({ results });
    },
  );
};
