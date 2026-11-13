import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { KINDS, countQuestions, readMoodleXml, typeNotes } from "../asker/questions.js";
import { reply } from "./reply.js";
import { absolutePath, groupSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

const question = z.object({
  name: z.string().describe("Its name, as exclude_questions takes it"),
  group: z.string(),
  kind: z.enum(KINDS),
  template: z.string().describe("Asker's question template (d2def-misspelled, t5table…): asker_input_reference's questions topic says what each asks"),
  type: z.string().describe("Moodle's question type"),
  text: z.string().describe("The question as plain text; files show as [image: …], [audio: …], [video: …]"),
  correct: z.boolean().optional().describe("truefalse: the right answer"),
  options: z.array(z.object({ text: z.string(), fraction: z.number(), correct: z.boolean() })).optional().describe("multichoice: every option, with Moodle's grade in percent"),
  accepted: z.array(z.string()).optional().describe("shortanswer: the accepted answers"),
  pairs: z.array(z.object({ prompt: z.string(), answer: z.string() })).optional().describe("matching: each prompt and its answer; an empty prompt is an extra answer"),
  order: z.array(z.string()).optional().describe("ordering: the items in their right order"),
  feedback: z.string().optional(),
  files: z.array(z.string()).optional().describe("Files embedded in it"),
});

export const registerReadQuestions: RegisterTool = (server) => {
  server.registerTool(
    "read_questions",
    {
      title: "Read generated questions",
      description:
        "Read the questions in a Moodle XML file (generate_questions' output, or any Moodle XML of questions) to review them with the person: each one's name, where it comes from (concept, problem or code file, and kind), its Moodle type, its text and its answers with the right one. A page at a time (offset, limit; next is the following page's offset), optionally only one group, kind or type, or some names. Also the counts for the whole file and notes on types a Moodle may not take. Show them to the person before anything is imported. Only reads.",
      inputSchema: {
        path: absolutePath("The Moodle XML file"),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(50).optional().describe("How many, 20 by default"),
        group: z.string().optional().describe("Only this concept, problem or code file"),
        kind: z.enum(KINDS).optional(),
        type: z.string().optional().describe("Only this Moodle type: truefalse, multichoice, shortanswer, matching, ordering, ddmatch…"),
        template: z.string().optional().describe("Only questions whose Asker template contains this: \"misspelled\", \"d3hidden\", \"t9table\""),
        names: z.array(z.string()).optional().describe("Only these questions"),
      },
      outputSchema: {
        path: z.string(),
        category: z.string().optional().describe("The category it imports into, when the file sets one"),
        total: z.number().describe("How many match the filters"),
        all: z.object({ total: z.number(), groups: z.array(groupSchema) }).describe("The whole file"),
        notes: z.array(z.string()),
        questions: z.array(question),
        next: z.number().optional().describe("The offset of the next page, when there's one"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path: file, offset = 0, limit = 20, group, kind, type, template, names }) => {
      if (!path.isAbsolute(file)) throw new Error(`${file}: give an absolute path`);
      if (!existsSync(file)) throw new Error(`${file}: there's no such file`);
      if (path.extname(file).toLowerCase() !== ".xml") throw new Error(`${file}: read_questions reads Moodle XML (the -moodle.xml file generate_questions writes)`);
      const { category, questions } = readMoodleXml(readFileSync(file, "utf8"));
      const { all, groups } = countQuestions(questions);
      const matching = questions.filter((q) => (!group || q.group === group) && (!kind || q.kind === kind) && (!type || q.type === type) && (!template || q.template.includes(template)) && (!names?.length || names.includes(q.name)));
      const page = matching.slice(offset, offset + limit);
      const next = offset + limit < matching.length ? offset + limit : undefined;
      return reply({
        path: file,
        ...(category !== undefined ? { category } : {}),
        total: matching.length,
        all: { total: all.total, groups },
        notes: typeNotes(all),
        questions: page,
        ...(next !== undefined ? { next } : {}),
      });
    },
  );
};
