// The record's shapes: one teacher's companies, each with its contacts. No country's rules here.

export const STATUSES = ["to_contact", "contacted", "interested", "meeting", "agreement", "hosting", "not_now", "declined"] as const;
export type Status = (typeof STATUSES)[number];

/** What each status means, for descriptions and exports. */
export const STATUS_LABELS: Record<Status, string> = {
  to_contact: "to contact",
  contacted: "contacted",
  interested: "interested",
  meeting: "meeting",
  agreement: "agreement",
  hosting: "hosting students",
  not_now: "not now",
  declined: "declined",
};

/** Statuses still in play: a follow-up is expected. */
export const OPEN_STATUSES: Status[] = ["to_contact", "contacted", "interested", "meeting", "agreement"];

export const CHANNELS = ["email", "phone", "visit", "meeting", "video", "form", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

/** A named person at a company: personal data, kept only as needed. */
export interface Person {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface Contact {
  date: string;
  channel: Channel;
  summary: string;
  person?: string;
  nextStep?: string;
  nextStepDate?: string;
}

export interface Company {
  id: number;
  name: string;
  taxId?: string;
  sector?: string;
  town?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  people?: Person[];
  tags?: string[];
  notes?: string;
  status: Status;
  /** Where it came from: "osm", "places", "site", "import", "manual". */
  source?: string;
  /** OpenStreetMap's element ("node/123"). */
  osmId?: string;
  /** Google Places' place_id: the only thing kept from Places (its terms). */
  placeId?: string;
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
}

/** The fields a person sets on a company (add_company, update_company, imports). */
export const EDITABLE_FIELDS = ["name", "taxId", "sector", "town", "address", "phone", "email", "website", "people", "tags", "notes", "status", "source", "osmId", "placeId"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type CompanyInput = Partial<Pick<Company, EditableField>>;

export interface RecordFile {
  version: 1;
  nextId: number;
  companies: Company[];
}

/** Lowercase, without accents, punctuation or common legal-form words: for matching names. */
export function normalizeName(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ");
  const legal = new Set(["sl", "slu", "sll", "sa", "sau", "scp", "cb", "sc", "srl", "spa", "sas", "sarl", "ltd", "llc", "inc", "plc", "gmbh", "ag", "bv", "nv", "co", "coop"]);
  while (words.length > 1 && legal.has(words[words.length - 1] ?? "")) words.pop();
  // "S. L." is two words once its dots are gone.
  if (words.length > 2 && words[words.length - 2] === "s" && ["l", "a"].includes(words[words.length - 1] ?? "")) words.splice(-2);
  return words.join(" ");
}

/** A tax id compared without spaces, dots, dashes or a country prefix's case. */
export const normalizeTaxId = (taxId: string): string => taxId.replace(/[\s.\-/]/g, "").toUpperCase();

/** A town compared like a name, without legal words. */
export const normalizeTown = (town: string): string =>
  town
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** A website's host without www., for matching. */
export function hostOf(url: string): string | undefined {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

/** A company's last contact, and its pending next step (the latest contact's). */
export function lastContact(company: Company): Contact | undefined {
  return [...company.contacts].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}
