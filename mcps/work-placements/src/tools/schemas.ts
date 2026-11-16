// The shapes tools share: a company as the record keeps it, and the fields a person sets.
import { z } from "zod";
import { CHANNELS, STATUSES } from "../record/model.js";

export const statusSchema = z.enum(STATUSES).describe("to_contact, contacted, interested, meeting, agreement, hosting (hosting students), not_now, declined");
export const channelSchema = z.enum(CHANNELS);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a date as YYYY-MM-DD");

export const personSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export const contactSchema = z.object({
  date: z.string(),
  channel: channelSchema,
  summary: z.string(),
  person: z.string().optional(),
  nextStep: z.string().optional(),
  nextStepDate: z.string().optional(),
});

/** The fields add_company and update_company take. */
export const companyFields = {
  name: z.string().min(1).describe("The company's name"),
  taxId: z.string().optional().describe("Its tax id (CIF, VAT number…), the surest way to spot a duplicate"),
  sector: z.string().optional().describe("What it does, in a few words or a sector id from search_companies"),
  town: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional().describe("The company's general phone"),
  email: z.string().optional().describe("The company's generic address (info@, contact@…): draft_emails writes to it"),
  website: z.string().optional(),
  people: z.array(personSchema).optional().describe("Named contacts at the company: personal data, only what's needed and with the person's yes. Replaces the list"),
  tags: z.array(z.string()).optional().describe("The person's own labels, such as the course or group the placements are for. Replaces the list"),
  notes: z.string().optional(),
  status: statusSchema.optional(),
  source: z.string().optional().describe("Where it came from: osm, places, site, import, manual"),
  osmId: z.string().optional().describe("OpenStreetMap's element, as search_companies gives it (node/123)"),
  placeId: z.string().optional().describe("Google Places' place id, as search_companies gives it: the only thing kept from Places"),
};

export const companySchema = z.object({
  id: z.number(),
  name: z.string(),
  taxId: z.string().optional(),
  sector: z.string().optional(),
  town: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  people: z.array(personSchema).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: statusSchema,
  source: z.string().optional(),
  osmId: z.string().optional(),
  placeId: z.string().optional(),
  contacts: z.array(contactSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
