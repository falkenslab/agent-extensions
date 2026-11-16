import { z } from "zod";
import { today } from "../config.js";
import { lastContact } from "../record/model.js";
import { filterCompanies, getCompany, nextStep, readRecord } from "../record/store.js";
import { reply } from "./reply.js";
import { companySchema, dateSchema, statusSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerListCompanies: RegisterTool = (server) => {
  server.registerTool(
    "list_companies",
    {
      title: "List the companies in the record",
      description:
        "List the companies in the person's record, filtered by status, town, sector, tag or text, each with its status, last contact and next step; due (today) or dueBy (a date) keeps only open companies whose next step is due by then, for the day's follow-up. With id, one company in full, with every contact. Pages: limit and offset, more says there's more. Only reads.",
      inputSchema: {
        id: z.number().int().optional().describe("One company, in full with its contacts"),
        status: z.array(statusSchema).optional(),
        town: z.string().optional(),
        sector: z.string().optional(),
        tag: z.string().optional(),
        query: z.string().optional().describe("Text in its name, notes, sector, town, email, website or tags"),
        due: z.boolean().optional().describe("Only those whose next step is due today or earlier"),
        dueBy: dateSchema.optional().describe("Only those whose next step is due on or before this date"),
        limit: z.number().int().min(1).max(500).optional().describe("Default 50"),
        offset: z.number().int().min(0).optional(),
      },
      outputSchema: {
        total: z.number(),
        more: z.boolean(),
        companies: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            status: statusSchema,
            sector: z.string().optional(),
            town: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            website: z.string().optional(),
            tags: z.array(z.string()).optional(),
            lastContact: z.string().optional().describe("Its date"),
            lastChannel: z.string().optional(),
            nextStep: z.string().optional(),
            nextStepDate: z.string().optional(),
          }),
        ),
        company: companySchema.optional().describe("The one asked for by id"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id, status, town, sector, tag, query, due, dueBy, limit = 50, offset = 0 }) => {
      const record = readRecord();
      if (id !== undefined) return reply({ total: 1, more: false, companies: [], company: getCompany(record, id) });
      const by = dueBy ?? (due ? today() : undefined);
      const matching = filterCompanies(record.companies, { status, town, sector, tag, query, ...(by ? { dueBy: by } : {}) });
      const sorted = by ? [...matching].sort((a, b) => (nextStep(a)?.nextStepDate ?? "").localeCompare(nextStep(b)?.nextStepDate ?? "")) : [...matching].sort((a, b) => a.name.localeCompare(b.name));
      const page = sorted.slice(offset, offset + limit).map((c) => {
        const last = lastContact(c);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          ...(c.sector ? { sector: c.sector } : {}),
          ...(c.town ? { town: c.town } : {}),
          ...(c.email ? { email: c.email } : {}),
          ...(c.phone ? { phone: c.phone } : {}),
          ...(c.website ? { website: c.website } : {}),
          ...(c.tags?.length ? { tags: c.tags } : {}),
          ...(last ? { lastContact: last.date, lastChannel: last.channel } : {}),
          ...nextStep(c),
        };
      });
      return reply({ total: matching.length, more: offset + limit < matching.length, companies: page });
    },
  );
};
