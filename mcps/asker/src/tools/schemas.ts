// Output schemas shared by the tools.
import { z } from "zod";

export const countsSchema = {
  total: z.number(),
  byKind: z.record(z.string(), z.number()).describe("By where it comes from in Asker: definitions, table-matching, one-field-tables, files, sequences, table-rows, problem-answers, problem-steps, code"),
  byType: z.record(z.string(), z.number()).describe("By Moodle question type"),
};

export const groupSchema = z.object({ group: z.string().describe("The concept's first name, the problem's name or the code file's"), ...countsSchema });

export const hintSchema = z.object({ file: z.string(), line: z.number().optional(), message: z.string() });

export const absolutePath = (what: string) => z.string().min(1).describe(`${what}: an absolute path on this computer`);
