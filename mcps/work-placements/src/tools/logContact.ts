import { z } from "zod";
import { today } from "../config.js";
import { changeRecord, logContact } from "../record/store.js";
import { reply } from "./reply.js";
import { channelSchema, companySchema, dateSchema, statusSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerLogContact: RegisterTool = (server) => {
  server.registerTool(
    "log_contact",
    {
      title: "Log a contact with a company",
      description:
        "Note a contact with a company in the record: an email the person sent, a call, a visit, a meeting, with its date (default today), channel, a short summary, who it was with, and the next step with its date, which is what the follow-ups (list_companies with due or dueBy, pipeline_summary) are built from. A company still to_contact becomes contacted, unless status says otherwise. Log only what the person says happened: a draft isn't a contact until they've sent it. Writes only on this computer.",
      inputSchema: {
        id: z.number().int().describe("The company's id in the record"),
        channel: channelSchema.describe("email, phone, visit, meeting, video, form (a web form) or other"),
        summary: z.string().min(1).describe("What happened, in a line or two"),
        date: dateSchema.optional().describe("When, YYYY-MM-DD (default today)"),
        person: z.string().optional().describe("Who it was with at the company, if the person wants it noted"),
        nextStep: z.string().optional().describe("What to do next: call again, send the agreement…"),
        nextStepDate: dateSchema.optional().describe("When to do it, YYYY-MM-DD"),
        status: statusSchema.optional().describe("The company's new status, when this contact changes it"),
      },
      outputSchema: { company: companySchema },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ id, channel, summary, date, person, nextStep, nextStepDate, status }) =>
      reply({
        company: changeRecord((record) =>
          logContact(record, id, { date: date ?? today(), channel, summary, ...(person ? { person } : {}), ...(nextStep ? { nextStep } : {}), ...(nextStepDate ? { nextStepDate } : {}) }, status),
        ),
      }),
  );
};
