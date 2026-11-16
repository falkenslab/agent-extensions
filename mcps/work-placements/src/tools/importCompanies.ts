import { z } from "zod";
import { addCompany, changeRecord, findDuplicate, readRecord } from "../record/store.js";
import { IMPORT_FIELDS, type ImportField, mapColumns, readTable, rowToCompany } from "../files/table.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerImportCompanies: RegisterTool = (server) => {
  server.registerTool(
    "import_companies",
    {
      title: "Import companies from a spreadsheet",
      description:
        "Import companies into the record from a CSV or Excel (.xlsx) file on this computer: last year's companies, a chamber of commerce's list, a regional platform's export. Columns are recognised by their headings in English or Spanish (name/empresa, tax id/CIF/NIF, town/localidad, email/correo, phone/teléfono, website/web, sector, status/estado, notes, contact person…), or mapped with columns. Companies already in the record (same tax id, or name and town) are skipped and listed, never overwritten. Run it first with dryRun to show the person what would be added and how the columns were read; then without, with their yes. Writes only on this computer.",
      inputSchema: {
        path: z.string().describe("The .csv or .xlsx file (absolute path)"),
        sheet: z.string().optional().describe("For an .xlsx, the sheet's name (default the first)"),
        columns: z.record(z.enum(IMPORT_FIELDS), z.string()).optional().describe("Which column heading fills each field, when the headings aren't recognised: { \"name\": \"Razón social\", \"town\": \"Población\" }"),
        source: z.string().optional().describe("Where the list comes from, kept with each company (default import)"),
        tags: z.array(z.string()).optional().describe("Labels added to every company imported, such as the course"),
        dryRun: z.boolean().optional().describe("Only show what would happen; change nothing"),
      },
      outputSchema: {
        dryRun: z.boolean(),
        rows: z.number().describe("Data rows in the file"),
        columns: z.record(z.string(), z.string()).describe("Each field and the heading it was read from"),
        ignoredColumns: z.array(z.string()),
        added: z.array(z.object({ id: z.number().optional(), name: z.string(), town: z.string().optional() })),
        duplicates: z.array(z.object({ row: z.number(), name: z.string(), existing: z.number(), reason: z.string() })),
        skipped: z.array(z.object({ row: z.number(), reason: z.string() })),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ path, sheet, columns, source = "import", tags, dryRun = false }) => {
      const rows = readTable(path, sheet);
      const [header, ...data] = rows;
      if (!header) throw new Error(`${path} is empty.`);
      const { map, ignored } = mapColumns(header, columns as Partial<Record<ImportField, string>> | undefined);
      if (map.name === undefined) throw new Error(`No column was recognised as the company's name; the columns are ${header.map((h) => `"${h}"`).join(", ")}. Map it with columns: { "name": "<heading>" }.`);
      const result = changeOrRead(dryRun, (record) => {
        const added: { id?: number; name: string; town?: string }[] = [];
        const duplicates: { row: number; name: string; existing: number; reason: string }[] = [];
        const skipped: { row: number; reason: string }[] = [];
        data.forEach((row, i) => {
          const line = i + 2;
          const input = rowToCompany(row, map);
          if (!input.name) return void skipped.push({ row: line, reason: "no name" });
          input.source = source;
          if (tags?.length) input.tags = [...new Set([...(input.tags ?? []), ...tags])];
          const duplicate = findDuplicate(record.companies, input);
          if (duplicate) return void duplicates.push({ row: line, name: input.name, existing: duplicate.company.id, reason: duplicate.reason });
          const company = addCompany(record, input, { allowDuplicate: true });
          added.push({ ...(dryRun ? {} : { id: company.id }), name: company.name, ...(company.town ? { town: company.town } : {}) });
        });
        return { added, duplicates, skipped };
      });
      const columnNames = Object.fromEntries(Object.entries(map).map(([field, index]) => [field, header[index] ?? ""]));
      return reply({ dryRun, rows: data.length, columns: columnNames, ignoredColumns: ignored, ...result });
    },
  );
};

/** Runs fn on the record and saves it, or on a copy that's thrown away when only trying. */
function changeOrRead<T>(dryRun: boolean, fn: (record: ReturnType<typeof readRecord>) => T): T {
  return dryRun ? fn(readRecord()) : changeRecord(fn);
}
