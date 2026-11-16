import { z } from "zod";
import { defaultArea, placesKey } from "../config.js";
import { readRecord, matchInRecord } from "../record/store.js";
import { type FoundCompany, OSM_ATTRIBUTION, resolveArea, searchOsm } from "../search/osm.js";
import { searchPlaces } from "../search/places.js";
import { SECTORS, sectorTags } from "../search/sectors.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const SECTOR_LIST = SECTORS.map((s) => `${s.id} (${s.label})`).join(", ");

export const registerSearchCompanies: RegisterTool = (server) => {
  server.registerTool(
    "search_companies",
    {
      title: "Search for companies",
      description: `Search for businesses in an area by sector, on OpenStreetMap (always) and on Google Places (only when the person has set their own Places key). Sectors: ${SECTOR_LIST}; or a raw OSM tag such as craft=carpenter or office. Each result says whether it's already in the record (inRecord, its id), with its contact data when the source has it; OSM has an email for few businesses, so read_company_site fills the gaps. From Places only the placeId may be kept: show its other data, and add a Places result to the record only with what the person confirms or what the company's own site says. Only reads; adds nothing to the record.`,
      inputSchema: {
        sectors: z.array(z.string()).min(1).describe("Sector ids from the list, or OSM tags (key=value, or key)"),
        area: z.string().optional().describe("A town or region (\"La Laguna, Tenerife\"), or \"lat,lon\". Default: the area in the settings"),
        radiusKm: z.number().positive().max(50).optional().describe("Search around the place's centre within this radius instead of inside its boundary (default for a point: 5 km)"),
        limit: z.number().int().min(1).max(200).optional().describe("At most this many results (default 50), those with more ways to reach them first"),
        includeKnown: z.boolean().optional().describe("Also list those already in the record (default true)"),
      },
      outputSchema: {
        area: z.string().describe("The place searched, as OSM names it"),
        total: z.number().describe("Results found before the limit"),
        companies: z.array(
          z.object({
            name: z.string(),
            source: z.enum(["osm", "places"]),
            sector: z.string().optional(),
            address: z.string().optional(),
            town: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            website: z.string().optional(),
            osmId: z.string().optional(),
            placeId: z.string().optional(),
            lat: z.number().optional(),
            lon: z.number().optional(),
            inRecord: z.number().optional().describe("The record's id, when it's already there"),
          }),
        ),
        unknownSectors: z.array(z.string()).optional().describe("Sectors not understood: say so, or retry with an id from the list"),
        places: z.string().optional().describe("Whether Google Places was searched, and why not"),
        attribution: z.string().describe("Cite it wherever OSM's data is shown or kept"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ sectors, area, radiusKm, limit = 50, includeKnown = true }) => {
      const where = area ?? defaultArea();
      if (!where) throw new Error("Say where to search (a town, a region or \"lat,lon\"), or set a default area in the extension's settings (WORK_PLACEMENTS_AREA).");
      const { tags, unknown } = sectorTags(sectors);
      if (!tags.length) throw new Error(`None of these sectors is known: ${unknown.join(", ")}. Use one of: ${SECTORS.map((s) => s.id).join(", ")}, or an OSM tag like craft=carpenter.`);
      const resolved = await resolveArea(where);
      let found: FoundCompany[] = await searchOsm(tags, resolved, radiusKm);

      const key = placesKey();
      let places: string;
      if (key) {
        const known = sectors.map((s) => SECTORS.find((x) => x.id === s.trim().toLowerCase())).filter((s) => s !== undefined);
        const queries = known.length ? known.map((s) => ({ text: `${s.places} in ${where}`, sector: s.id })) : sectors.map((s) => ({ text: `${s} in ${where}`, sector: undefined }));
        const fromPlaces: FoundCompany[] = [];
        for (const query of queries) fromPlaces.push(...(await searchPlaces(query.text, key, query.sector)));
        const seen = new Set(found.map((f) => f.name.toLowerCase()));
        const fresh = fromPlaces.filter((p) => !seen.has(p.name.toLowerCase()) && (seen.add(p.name.toLowerCase()), true));
        found = [...found, ...fresh];
        places = `searched: ${fresh.length} more`;
      } else places = "not searched: no Google Places key in the settings (optional)";

      const record = readRecord();
      const marked = found.map((f) => {
        const match = matchInRecord(record.companies, f);
        return match ? { ...f, inRecord: match.id } : f;
      });
      const shown = includeKnown ? marked : marked.filter((f) => !("inRecord" in f));
      return reply({
        area: resolved.name,
        total: shown.length,
        companies: shown.slice(0, limit),
        ...(unknown.length ? { unknownSectors: unknown } : {}),
        places,
        attribution: OSM_ATTRIBUTION,
      });
    },
  );
};
