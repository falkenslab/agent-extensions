import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { outputDir, today } from "../config.js";
import { writeCsv } from "../files/csv.js";
import { freePath } from "../files/eml.js";
import { companyRows, contactRows } from "../files/table.js";
import { writeXlsx } from "../files/xlsx.js";
import { filterCompanies, readRecord } from "../record/store.js";
import { reply } from "./reply.js";
import { statusSchema } from "./schemas.js";
import type { RegisterTool } from "./types.js";

export const registerExportCompanies: RegisterTool = (server) => {
  server.registerTool(
    "export_companies",
    {
      title: "Export the companies to a spreadsheet",
      description:
        "Write the record, or part of it, as an Excel workbook (.xlsx, a sheet of companies and one of contacts) or a CSV file, for the department: each company with its status, contact data, last contact and next step. Named people (the contact person columns, and who each contact was with) go in only with people: true, as they're personal data. Writes a new file in the drafts and exports folder (or dir), never overwriting one; tell the person where it is. Sends nothing.",
      inputSchema: {
        format: z.enum(["xlsx", "csv"]).optional().describe("xlsx (default) or csv"),
        status: z.array(statusSchema).optional().describe("Only these statuses"),
        tag: z.string().optional().describe("Only companies with this label"),
        people: z.boolean().optional().describe("Include the first named contact person of each company (personal data: only when the person asks)"),
        delimiter: z.enum([",", ";"]).optional().describe("For CSV: \",\" (default) or \";\", which Excel expects where the decimal separator is a comma"),
        dir: z.string().optional().describe("Folder to write in (absolute). Default: the exports folder from the settings"),
        name: z.string().optional().describe("File name without extension (default companies-<date>)"),
      },
      outputSchema: {
        path: z.string(),
        format: z.enum(["xlsx", "csv"]),
        companies: z.number(),
        contacts: z.number().optional().describe("Rows in the contacts sheet (xlsx)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ format = "xlsx", status, tag, people, delimiter, dir, name }) => {
      const companies = filterCompanies(readRecord().companies, { status, tag }).sort((a, b) => a.id - b.id);
      const folder = dir ? path.resolve(dir) : path.join(outputDir(), "exports");
      mkdirSync(folder, { recursive: true });
      const file = freePath(folder, name?.replace(/\.(xlsx|csv)$/i, "") || `companies-${today()}`, `.${format}`);
      const rows = companyRows(companies, { people });
      if (format === "csv") {
        writeFileSync(file, writeCsv(rows, delimiter));
        return reply({ path: file, format, companies: companies.length });
      }
      const contacts = contactRows(companies, { people });
      writeFileSync(file, writeXlsx([{ name: "Companies", rows, numeric: [0, rows[0]?.indexOf("contacts") ?? -1] }, { name: "Contacts", rows: contacts, numeric: [0] }]));
      return reply({ path: file, format, companies: companies.length, contacts: contacts.length - 1 });
    },
  );
};
