// The record: one JSON file in the data folder, read for every call and written atomically (a temporary
// file renamed over the old one), so a crash never leaves half a file. No native dependencies.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { addDays, today } from "../config.js";
import { dataDir } from "../dataDir.js";
import {
  type Company,
  type CompanyInput,
  type Contact,
  type EditableField,
  OPEN_STATUSES,
  type RecordFile,
  STATUSES,
  type Status,
  hostOf,
  lastContact,
  normalizeName,
  normalizeTaxId,
  normalizeTown,
} from "./model.js";

export const recordFile = (): string => path.join(dataDir(), "record.json");

export function readRecord(file: string = recordFile()): RecordFile {
  if (!existsSync(file)) return { version: 1, nextId: 1, companies: [] };
  let parsed: RecordFile;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8")) as RecordFile;
  } catch (error) {
    throw new Error(`The record at ${file} can't be read (${(error as Error).message}). Nothing was changed; fix or move that file.`, { cause: error });
  }
  if (!Array.isArray(parsed.companies)) throw new Error(`The record at ${file} isn't this server's. Nothing was changed.`);
  return parsed;
}

export function writeRecord(record: RecordFile, file: string = recordFile()): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

/** Reads the record, lets fn change it, and writes it back; returns what fn returns. */
export function changeRecord<T>(fn: (record: RecordFile) => T, file: string = recordFile()): T {
  const record = readRecord(file);
  const result = fn(record);
  writeRecord(record, file);
  return result;
}

export interface Duplicate {
  company: Company;
  reason: string;
}

/** The company already in the record that this one would repeat: same tax id, OSM element, place, or name and town. */
export function findDuplicate(companies: Company[], input: CompanyInput, except?: number): Duplicate | undefined {
  const others = companies.filter((c) => c.id !== except);
  if (input.taxId) {
    const taxId = normalizeTaxId(input.taxId);
    const company = others.find((c) => c.taxId && normalizeTaxId(c.taxId) === taxId);
    if (company) return { company, reason: `same tax id (${input.taxId})` };
  }
  if (input.osmId) {
    const company = others.find((c) => c.osmId === input.osmId);
    if (company) return { company, reason: `same OpenStreetMap element (${input.osmId})` };
  }
  if (input.placeId) {
    const company = others.find((c) => c.placeId === input.placeId);
    if (company) return { company, reason: "same Google Places place" };
  }
  if (input.name) {
    const name = normalizeName(input.name);
    const town = input.town ? normalizeTown(input.town) : undefined;
    const company = others.find((c) => normalizeName(c.name) === name && (!town || !c.town || normalizeTown(c.town) === town));
    if (company) return { company, reason: town && company.town ? "same name and town" : "same name (a town is missing on one of them)" };
  }
  return undefined;
}

export class DuplicateError extends Error {
  constructor(
    public readonly duplicate: Duplicate,
    hint = "Nothing was added; update that one with update_company, or add this one with allowDuplicate if they really are two companies.",
  ) {
    super(`Already in the record as #${duplicate.company.id} "${duplicate.company.name}"${duplicate.company.town ? ` (${duplicate.company.town})` : ""}: ${duplicate.reason}. ${hint}`);
    this.name = "DuplicateError";
  }
}

const clean = (input: CompanyInput): CompanyInput => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed;
    } else if (Array.isArray(value)) {
      if (value.length) out[key] = value;
    } else out[key] = value;
  }
  return out as CompanyInput;
};

/** Adds a company, unless it repeats one already there (DuplicateError) and allowDuplicate isn't set. */
export function addCompany(record: RecordFile, input: CompanyInput, options: { allowDuplicate?: boolean; now?: string } = {}): Company {
  const fields = clean(input);
  if (!fields.name) throw new Error("A company needs a name.");
  if (!options.allowDuplicate) {
    const duplicate = findDuplicate(record.companies, fields);
    if (duplicate) throw new DuplicateError(duplicate);
  }
  const now = options.now ?? new Date().toISOString();
  const company: Company = { id: record.nextId++, ...fields, name: fields.name, status: fields.status ?? "to_contact", contacts: [], createdAt: now, updatedAt: now };
  record.companies.push(company);
  return company;
}

export function getCompany(record: RecordFile, id: number): Company {
  const company = record.companies.find((c) => c.id === id);
  if (!company) throw new Error(`There's no company #${id} in the record; list_companies gives their ids.`);
  return company;
}

/** Sets the fields given and removes those in clear; refuses to make it repeat another company. */
export function updateCompany(record: RecordFile, id: number, set: CompanyInput, clear: EditableField[] = []): Company {
  const company = getCompany(record, id);
  const fields = clean(set);
  if (clear.includes("name")) throw new Error("A company's name can't be cleared, only changed.");
  const next: Record<string, unknown> = { ...company, ...fields };
  for (const field of clear) delete next[field];
  if (!next.status) next.status = "to_contact";
  const candidate = next as unknown as Company;
  if (fields.taxId || fields.name || fields.town || fields.osmId || fields.placeId) {
    const duplicate = findDuplicate(record.companies, candidate, id);
    if (duplicate) throw new DuplicateError(duplicate, "Nothing was changed; if they're the same company, keep one and mark the other declined or merge their notes.");
  }
  candidate.updatedAt = new Date().toISOString();
  record.companies[record.companies.indexOf(company)] = candidate;
  return candidate;
}

/** Adds a contact; a company still "to contact" becomes "contacted" unless a status is given. */
export function logContact(record: RecordFile, id: number, contact: Contact, status?: Status): Company {
  const company = getCompany(record, id);
  company.contacts.push(contact);
  if (status) company.status = status;
  else if (company.status === "to_contact") company.status = "contacted";
  company.updatedAt = new Date().toISOString();
  return company;
}

export interface ListFilter {
  status?: Status[];
  town?: string;
  sector?: string;
  tag?: string;
  query?: string;
  /** Only those whose next step is due on or before this date. */
  dueBy?: string;
}

/** The pending next step: the latest contact's, if it has a date or a text. */
export function nextStep(company: Company): Pick<Contact, "nextStep" | "nextStepDate"> | undefined {
  const last = lastContact(company);
  return last && (last.nextStep || last.nextStepDate) ? { ...(last.nextStep ? { nextStep: last.nextStep } : {}), ...(last.nextStepDate ? { nextStepDate: last.nextStepDate } : {}) } : undefined;
}

export function filterCompanies(companies: Company[], filter: ListFilter): Company[] {
  const fold = (s: string) => normalizeTown(s);
  return companies.filter((c) => {
    if (filter.status?.length && !filter.status.includes(c.status)) return false;
    if (filter.town && !(c.town && fold(c.town).includes(fold(filter.town)))) return false;
    if (filter.sector && !(c.sector && fold(c.sector).includes(fold(filter.sector)))) return false;
    if (filter.tag && !c.tags?.some((t) => fold(t) === fold(filter.tag ?? ""))) return false;
    if (filter.query) {
      const q = fold(filter.query);
      const text = fold([c.name, c.notes, c.sector, c.town, c.email, c.website, ...(c.tags ?? [])].filter(Boolean).join(" "));
      if (!text.includes(q)) return false;
    }
    if (filter.dueBy) {
      const step = nextStep(c);
      if (!step?.nextStepDate || step.nextStepDate > filter.dueBy || !OPEN_STATUSES.includes(c.status)) return false;
    }
    return true;
  });
}

export interface Summary {
  total: number;
  byStatus: Record<Status, number>;
  overdue: { id: number; name: string; nextStep?: string; nextStepDate: string }[];
  dueToday: { id: number; name: string; nextStep?: string; nextStepDate: string }[];
  upcoming: { id: number; name: string; nextStep?: string; nextStepDate: string }[];
  stale: { id: number; name: string; status: Status; lastContact: string }[];
  neverContacted: number;
}

/** Counts by status and what's due: overdue, today, the next days, and open companies silent too long. */
export function summarize(companies: Company[], options: { today?: string; days?: number; staleDays?: number } = {}): Summary {
  const now = options.today ?? today();
  const until = addDays(now, options.days ?? 7);
  const staleBefore = addDays(now, -(options.staleDays ?? 14));
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const summary: Summary = { total: companies.length, byStatus, overdue: [], dueToday: [], upcoming: [], stale: [], neverContacted: 0 };
  for (const c of companies) {
    byStatus[c.status]++;
    if (!c.contacts.length && c.status === "to_contact") summary.neverContacted++;
    if (!OPEN_STATUSES.includes(c.status)) continue;
    const step = nextStep(c);
    if (step?.nextStepDate) {
      const item = { id: c.id, name: c.name, ...step, nextStepDate: step.nextStepDate };
      if (step.nextStepDate < now) summary.overdue.push(item);
      else if (step.nextStepDate === now) summary.dueToday.push(item);
      else if (step.nextStepDate <= until) summary.upcoming.push(item);
    } else {
      const last = lastContact(c);
      if (last && last.date < staleBefore) summary.stale.push({ id: c.id, name: c.name, status: c.status, lastContact: last.date });
    }
  }
  const byDate = (a: { nextStepDate: string }, b: { nextStepDate: string }) => a.nextStepDate.localeCompare(b.nextStepDate);
  summary.overdue.sort(byDate);
  summary.upcoming.sort(byDate);
  summary.stale.sort((a, b) => a.lastContact.localeCompare(b.lastContact));
  return summary;
}

/** The record's company a search result is, by OSM element, place, website or name and town. */
export function matchInRecord(companies: Company[], found: { osmId?: string; placeId?: string; website?: string; name: string; town?: string }): Company | undefined {
  const host = found.website ? hostOf(found.website) : undefined;
  return (
    companies.find((c) => (found.osmId && c.osmId === found.osmId) || (found.placeId && c.placeId === found.placeId)) ??
    (host ? companies.find((c) => c.website && hostOf(c.website) === host) : undefined) ??
    findDuplicate(companies, { name: found.name, ...(found.town ? { town: found.town } : {}) })?.company
  );
}
