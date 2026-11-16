import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { outputDir, today } from "../config.js";
import { PLACEHOLDERS, emlText, fill, freePath, parseTemplateFile, slug, unknownPlaceholders } from "../files/eml.js";
import { getCompany, readRecord } from "../record/store.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const NAMES = Object.keys(PLACEHOLDERS)
  .map((n) => `{{${n}}}`)
  .join(", ");

export const registerDraftEmails: RegisterTool = (server) => {
  server.registerTool(
    "draft_emails",
    {
      title: "Write email drafts to companies",
      description: `Write one email draft per company, as an .eml file that Outlook and Thunderbird open unsent (X-Unsent: 1), addressed to the company's own email in the record, from the person's template filled in for each one: ${NAMES}, and {{name|fallback}} for a value a company may lack. Never sends anything: the person reviews and sends each draft, then log_contact notes it. Companies without an email, or missing a placeholder without a fallback, are skipped and listed. One message to one company, never a mass mailing with everyone in To or Cc. Writes new files in the drafts folder (or dir), never overwriting one.`,
      inputSchema: {
        companyIds: z.array(z.number().int()).min(1).max(50).describe("The companies, by their ids in the record"),
        subject: z.string().optional().describe("The subject, with placeholders"),
        body: z.string().optional().describe("The body as plain text, with placeholders: the person's own template"),
        templatePath: z.string().optional().describe("Or a text file with the template (absolute path); a first line \"Subject: …\" gives the subject"),
        from: z.string().optional().describe("The person's address, so the client sends from it"),
        fromName: z.string().optional().describe("The person's name as it shows"),
        dir: z.string().optional().describe("Folder to write in (absolute). Default: drafts/<date> in the drafts and exports folder"),
      },
      outputSchema: {
        dir: z.string(),
        drafts: z.array(z.object({ id: z.number(), name: z.string(), to: z.string(), path: z.string() })),
        skipped: z.array(z.object({ id: z.number(), name: z.string().optional(), reason: z.string() })),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ companyIds, subject, body, templatePath, from, fromName, dir }) => {
      let template = { subject, body };
      if (templatePath) {
        let text: string;
        try {
          text = readFileSync(templatePath, "utf8");
        } catch {
          throw new Error(`Can't read the template ${templatePath}: check the path (absolute).`);
        }
        const parsed = parseTemplateFile(text);
        template = { subject: subject ?? parsed.subject, body: body ?? parsed.body };
      }
      if (!template.body?.trim()) throw new Error("A template is needed: the person's own text as body (or templatePath). The server never writes the email itself.");
      if (!template.subject?.trim()) throw new Error("A subject is needed: subject, or a first line \"Subject: …\" in the template file.");
      const unknown = unknownPlaceholders(template.subject, template.body);
      if (unknown.length) throw new Error(`Unknown placeholders: ${unknown.map((n) => `{{${n}}}`).join(", ")}. The ones there are: ${NAMES}.`);

      const record = readRecord();
      const folder = dir ? path.resolve(dir) : path.join(outputDir(), "drafts", today());
      const drafts: { id: number; name: string; to: string; path: string }[] = [];
      const skipped: { id: number; name?: string; reason: string }[] = [];
      const taken = new Set<string>();
      for (const id of [...new Set(companyIds)]) {
        let company;
        try {
          company = getCompany(record, id);
        } catch {
          skipped.push({ id, reason: "not in the record" });
          continue;
        }
        if (!company.email) {
          skipped.push({ id, name: company.name, reason: "no email in the record: read_company_site may find one, or call" });
          continue;
        }
        const filledSubject = fill(template.subject, company);
        const filledBody = fill(template.body, company);
        const missing = [...new Set([...filledSubject.missing, ...filledBody.missing])];
        if (missing.length) {
          skipped.push({ id, name: company.name, reason: `no value for ${missing.map((n) => `{{${n}}}`).join(", ")}: add it to the company, or give the placeholder a fallback` });
          continue;
        }
        mkdirSync(folder, { recursive: true });
        const file = freePath(folder, slug(company.name), ".eml", taken);
        writeFileSync(file, emlText({ to: company.email, subject: filledSubject.text.replace(/\s+/g, " ").trim(), body: filledBody.text, ...(from ? { from } : {}), ...(fromName ? { fromName } : {}) }));
        drafts.push({ id, name: company.name, to: company.email, path: file });
      }
      return reply({ dir: folder, drafts, skipped });
    },
  );
};
