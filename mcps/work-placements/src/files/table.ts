// The record as a table for the department (export), and someone else's table as companies (import):
// columns recognised by their headings in English or Spanish, or mapped by hand.
import { readFileSync } from "node:fs";
import path from "node:path";
import { type Company, type CompanyInput, type Person, STATUSES, STATUS_LABELS, type Status, lastContact } from "../record/model.js";
import { nextStep } from "../record/store.js";
import { parseCsv } from "./csv.js";
import { readXlsx } from "./xlsx.js";

export const EXPORT_COLUMNS = ["id", "name", "status", "sector", "town", "address", "phone", "email", "website", "taxId", "contact person", "contact role", "contact email", "contact phone", "tags", "last contact", "last channel", "last summary", "next step", "next step date", "contacts", "notes", "source"] as const;

/** One row per company; with people only when asked (they're personal data). */
export function companyRows(companies: Company[], options: { people?: boolean } = {}): string[][] {
  const columns = EXPORT_COLUMNS.filter((c) => options.people || !c.startsWith("contact ")) as string[];
  const rows = companies.map((c) => {
    const last = lastContact(c);
    const step = nextStep(c);
    const person: Person | undefined = c.people?.[0];
    const values: Record<string, string> = {
      id: String(c.id),
      name: c.name,
      status: STATUS_LABELS[c.status],
      sector: c.sector ?? "",
      town: c.town ?? "",
      address: c.address ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      website: c.website ?? "",
      taxId: c.taxId ?? "",
      "contact person": person?.name ?? "",
      "contact role": person?.role ?? "",
      "contact email": person?.email ?? "",
      "contact phone": person?.phone ?? "",
      tags: (c.tags ?? []).join(", "),
      "last contact": last?.date ?? "",
      "last channel": last?.channel ?? "",
      "last summary": last?.summary ?? "",
      "next step": step?.nextStep ?? "",
      "next step date": step?.nextStepDate ?? "",
      contacts: String(c.contacts.length),
      notes: c.notes ?? "",
      source: c.source ?? "",
    };
    return columns.map((column) => values[column] ?? "");
  });
  return [columns, ...rows];
}

/** Every contact, one row each, for the workbook's second sheet; who it was with only when asked. */
export function contactRows(companies: Company[], options: { people?: boolean } = {}): string[][] {
  const rows = companies.flatMap((c) => c.contacts.map((k) => [String(c.id), c.name, k.date, k.channel, k.summary, ...(options.people ? [k.person ?? ""] : []), k.nextStep ?? "", k.nextStepDate ?? ""]));
  const header = ["company id", "company", "date", "channel", "summary", ...(options.people ? ["person"] : []), "next step", "next step date"];
  return [header, ...rows.sort((a, b) => (a[2] ?? "").localeCompare(b[2] ?? ""))];
}

/** The fields an imported column can fill. */
export const IMPORT_FIELDS = ["name", "taxId", "sector", "town", "address", "phone", "email", "website", "notes", "status", "tags", "contactName", "contactRole", "contactEmail", "contactPhone"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Headings each field is known by, folded (no accents, lowercase). */
const HEADINGS: Record<ImportField, string[]> = {
  name: ["name", "company", "company name", "business", "nombre", "empresa", "nombre empresa", "razon social", "entidad", "denominacion"],
  taxId: ["tax id", "taxid", "vat", "vat number", "cif", "nif", "cif nif", "nif cif", "cif empresa"],
  sector: ["sector", "activity", "actividad", "industry", "category", "categoria", "rama", "familia", "familia profesional"],
  town: ["town", "city", "municipality", "localidad", "municipio", "poblacion", "ciudad"],
  address: ["address", "direccion", "domicilio", "street", "calle"],
  phone: ["phone", "telephone", "tel", "telefono", "tlf", "tfno", "phone number", "telefono empresa"],
  email: ["email", "e mail", "mail", "correo", "correo electronico", "email empresa"],
  website: ["website", "web", "url", "site", "pagina web", "sitio web"],
  notes: ["notes", "note", "notas", "observaciones", "comments", "comentarios"],
  status: ["status", "estado", "situacion"],
  tags: ["tags", "etiquetas", "course", "curso", "ciclo"],
  contactName: ["contact", "contact person", "contact name", "contacto", "persona de contacto", "persona contacto", "tutor", "tutor empresa", "responsable"],
  contactRole: ["contact role", "role", "cargo", "puesto"],
  contactEmail: ["contact email", "email contacto", "correo contacto", "email tutor"],
  contactPhone: ["contact phone", "telefono contacto", "movil", "mobile", "telefono tutor"],
};

/** Which column fills each field: the mapping given, else the headings recognised. */
export function mapColumns(header: string[], given: Partial<Record<ImportField, string>> = {}): { map: Partial<Record<ImportField, number>>; ignored: string[] } {
  const folded = header.map(fold);
  const map: Partial<Record<ImportField, number>> = {};
  for (const [field, heading] of Object.entries(given) as [ImportField, string][]) {
    const index = folded.indexOf(fold(heading));
    if (index < 0) throw new Error(`There's no column "${heading}" for ${field}; the columns are ${header.map((h) => `"${h}"`).join(", ")}.`);
    map[field] = index;
  }
  for (const field of IMPORT_FIELDS) {
    if (map[field] !== undefined) continue;
    const index = folded.findIndex((h, i) => HEADINGS[field].includes(h) && !Object.values(map).includes(i));
    if (index >= 0) map[field] = index;
  }
  const used = new Set(Object.values(map));
  return { map, ignored: header.filter((_, i) => !used.has(i)) };
}

/** A status from the record's names or their labels, in English or Spanish. */
export function parseStatus(text: string): Status | undefined {
  const t = fold(text);
  if (!t) return undefined;
  const spanish: Record<string, Status> = {
    "por contactar": "to_contact",
    "sin contactar": "to_contact",
    contactada: "contacted",
    contactado: "contacted",
    interesada: "interested",
    interesado: "interested",
    reunion: "meeting",
    acuerdo: "agreement",
    convenio: "agreement",
    "acoge alumnado": "hosting",
    "con alumnado": "hosting",
    acogiendo: "hosting",
    "ahora no": "not_now",
    rechazada: "declined",
    rechazado: "declined",
  };
  return STATUSES.find((s) => fold(s) === t || fold(STATUS_LABELS[s]) === t) ?? spanish[t];
}

/** A row as a company's fields. */
export function rowToCompany(row: string[], map: Partial<Record<ImportField, number>>): CompanyInput {
  const get = (field: ImportField) => {
    const index = map[field];
    return index === undefined ? undefined : row[index]?.trim() || undefined;
  };
  const input: CompanyInput = {};
  for (const field of ["name", "taxId", "sector", "town", "address", "phone", "email", "website", "notes"] as const) {
    const value = get(field);
    if (value) input[field] = value;
  }
  const status = get("status");
  if (status && parseStatus(status)) input.status = parseStatus(status);
  const tags = get("tags");
  if (tags) input.tags = tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  const person = get("contactName");
  if (person) {
    const p: Person = { name: person };
    const role = get("contactRole");
    const email = get("contactEmail");
    const phone = get("contactPhone");
    if (role) p.role = role;
    if (email) p.email = email;
    if (phone) p.phone = phone;
    input.people = [p];
  }
  return input;
}

/** UTF-8, else Windows-1252: what Excel writes as "CSV" on a Spanish or English Windows. */
export function decodeText(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    return new TextDecoder("windows-1252").decode(data);
  }
}

/** A CSV or .xlsx file's rows. */
export function readTable(file: string, sheet?: string): string[][] {
  const ext = path.extname(file).toLowerCase();
  let data: Buffer;
  try {
    data = readFileSync(file);
  } catch {
    throw new Error(`Can't read ${file}: check the path (absolute) and that it exists.`);
  }
  if (ext === ".xlsx") return readXlsx(data, sheet);
  if (ext === ".csv" || ext === ".txt" || ext === ".tsv") return parseCsv(decodeText(data));
  throw new Error(`Only .csv and .xlsx files are imported, not ${ext || "files without an extension"}; save it as one of those first.`);
}
