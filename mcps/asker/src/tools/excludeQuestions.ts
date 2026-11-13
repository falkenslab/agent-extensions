import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { removeFromGift, removeFromMoodleXml } from "../asker/files.js";
import { reply } from "./reply.js";
import { absolutePath } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerExcludeQuestions: RegisterTool = (server) => {
  server.registerTool(
    "exclude_questions",
    {
      title: "Leave questions out of a file",
      description:
        "Write a copy of a Moodle XML or GIFT file of questions without the ones given, by name (as read_questions shows them) or by Moodle type (every ddmatch or ordering question, say), for importing only what the person kept. The original stays as it is, and no question in the copy changes: whole questions go. Writes a file: say where, and only overwrite with the person's yes. Returns how many were kept, which were left out, and the names it didn't find.",
      inputSchema: {
        path: absolutePath("The Moodle XML (.xml) or GIFT (.txt, .gift) file"),
        names: z.array(z.string()).optional().describe("The questions to leave out, by name"),
        types: z.array(z.string()).optional().describe("Leave out every question of these Moodle types"),
        outputPath: absolutePath("Where to write the copy, not the original"),
        overwrite: z.boolean().optional().describe("Write over a file that's there already: only with the person's yes"),
      },
      outputSchema: {
        outputPath: z.string(),
        kept: z.number(),
        removed: z.array(z.string()),
        notFound: z.array(z.string()).describe("Names given that the file doesn't have"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ path: file, names = [], types = [], outputPath, overwrite }) => {
      for (const p of [file, outputPath]) if (!path.isAbsolute(p)) throw new Error(`${p}: give an absolute path`);
      if (!existsSync(file)) throw new Error(`${file}: there's no such file`);
      if (!names.length && !types.length) throw new Error("Say which questions to leave out: names, types or both");
      if (path.resolve(file) === path.resolve(outputPath)) throw new Error("Write the copy somewhere else: the original stays as it is");
      if (existsSync(outputPath) && !overwrite) throw new Error(`${outputPath} is there already. Choose another name, or overwrite it with the person's yes (overwrite: true).`);
      const text = readFileSync(file, "utf8");
      const isXml = path.extname(file).toLowerCase() === ".xml" || /^\s*(<\?xml|<quiz>)/.test(text);
      const removal = isXml ? removeFromMoodleXml(text, { names, types }) : removeFromGift(text, { names, types });
      if (!removal.kept.length && !removal.removed.length) throw new Error(`${file} has no questions${isXml ? "" : " in GIFT (::name:: …)"}`);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, removal.text);
      const notFound = names.filter((name) => !removal.removed.includes(name));
      return reply({ outputPath, kept: removal.kept.length, removed: removal.removed, notFound });
    },
  );
};
