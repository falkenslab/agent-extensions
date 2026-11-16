import { z } from "zod";
import { readRecord, summarize } from "../record/store.js";
import { reply } from "./reply.js";
import { statusSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

const step = z.object({ id: z.number(), name: z.string(), nextStep: z.string().optional(), nextStepDate: z.string() });

export const registerPipelineSummary: RegisterTool = (server) => {
  server.registerTool(
    "pipeline_summary",
    {
      title: "Sum up the placement companies",
      description:
        "Sum up the record: how many companies in each status, the follow-ups overdue, due today and in the next days, the open companies without a next step that haven't been contacted in a while (stale), and how many were never contacted. For the day's follow-up (who to write to or call) and a department's overview. Only reads.",
      inputSchema: {
        days: z.number().int().min(1).max(60).optional().describe("How far ahead upcoming looks (default 7)"),
        staleDays: z.number().int().min(1).max(365).optional().describe("Days without a contact that make an open company stale (default 14)"),
      },
      outputSchema: {
        total: z.number(),
        byStatus: z.record(z.string(), z.number()),
        overdue: z.array(step),
        dueToday: z.array(step),
        upcoming: z.array(step),
        stale: z.array(z.object({ id: z.number(), name: z.string(), status: statusSchema, lastContact: z.string() })),
        neverContacted: z.number(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ days, staleDays }) => reply({ ...summarize(readRecord().companies, { days, staleDays }) }),
  );
};
