// OpenStreetMap: a place's name to a point or an area (Nominatim), and the businesses with the sectors'
// tags in it (Overpass). Both are public services with usage policies: one request at a time, and an
// identifying User-Agent. Data © OpenStreetMap contributors, under the ODbL.
import { USER_AGENT } from "../config.js";
import { sectorOf } from "./sectors.js";

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright)";

export interface Area {
  /** What was found, as Nominatim names it. */
  name: string;
  lat: number;
  lon: number;
  /** An Overpass area id, when the place is a boundary. */
  areaId?: number;
}

export interface FoundCompany {
  name: string;
  source: "osm" | "places";
  sector?: string;
  address?: string;
  town?: string;
  phone?: string;
  email?: string;
  website?: string;
  osmId?: string;
  placeId?: string;
  lat?: number;
  lon?: number;
}

const headers = { "User-Agent": USER_AGENT, Accept: "application/json" };

async function getJson(url: string, init: RequestInit, service: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(90_000) });
  } catch (error) {
    throw new Error(`${service} couldn't be reached (${(error as Error).message}). Check the connection and try again.`, { cause: error });
  }
  if ([429, 502, 503, 504].includes(response.status)) throw new Error(`${service} is busy right now (HTTP ${response.status}). Try again in a minute, or with a smaller area or fewer sectors.`);
  if (!response.ok) throw new Error(`${service} answered HTTP ${response.status}.`);
  return response.json();
}

/** "lat,lon", or a place's name looked up in Nominatim. */
export async function resolveArea(area: string): Promise<Area> {
  const point = area.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (point) return { name: area.trim(), lat: Number(point[1]), lon: Number(point[2]) };
  const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: area, format: "jsonv2", limit: "1" })}`;
  const results = (await getJson(url, {}, "OpenStreetMap's place search (Nominatim)")) as { lat: string; lon: string; osm_type: string; osm_id: number; display_name: string }[];
  const first = results[0];
  if (!first) throw new Error(`No place called "${area}" on OpenStreetMap. Try the town's full name with its region or country, or "lat,lon".`);
  const offset = first.osm_type === "relation" ? 3_600_000_000 : first.osm_type === "way" ? 2_400_000_000 : undefined;
  return { name: first.display_name, lat: Number(first.lat), lon: Number(first.lon), ...(offset ? { areaId: offset + first.osm_id } : {}) };
}

const quote = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** The Overpass QL for named businesses with these tags, in the area or around its point. */
export function overpassQuery(tags: [string, string | undefined][], area: Area, radiusKm?: number): string {
  const around = radiusKm !== undefined || area.areaId === undefined;
  const scope = around ? `(around:${Math.round((radiusKm ?? 5) * 1000)},${area.lat},${area.lon})` : "(area.a)";
  const lines = tags.map(([key, value]) => `  nwr[${quote(key)}${value ? `~${quote(value)}` : ""}]["name"]${scope};`);
  return ["[out:json][timeout:60];", ...(around ? [] : [`area(id:${area.areaId})->.a;`]), "(", ...lines, ");", "out center tags 1000;"].join("\n");
}

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** An element's company fields, from its tags. */
export function fromOsm(element: OsmElement): FoundCompany | undefined {
  const tags = element.tags ?? {};
  if (!tags.name) return undefined;
  const pick = (...keys: string[]) => keys.map((k) => tags[k]).find(Boolean);
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const address = [street, tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(", ");
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const found: FoundCompany = { name: tags.name, source: "osm", osmId: `${element.type}/${element.id}` };
  const set = (key: keyof FoundCompany, value: string | number | undefined) => {
    if (value !== undefined && value !== "") (found as unknown as Record<string, unknown>)[key] = value;
  };
  set("sector", sectorOf(tags));
  set("address", address);
  set("town", pick("addr:city", "addr:town", "addr:village"));
  set("phone", pick("contact:phone", "phone", "contact:mobile", "mobile")?.split(";")[0]?.trim());
  set("email", pick("contact:email", "email")?.split(";")[0]?.trim());
  set("website", pick("contact:website", "website", "url"));
  set("lat", lat);
  set("lon", lon);
  return found;
}

/** Runs the query and returns the businesses, those with more ways to contact them first. */
export async function searchOsm(tags: [string, string | undefined][], area: Area, radiusKm?: number): Promise<FoundCompany[]> {
  const query = overpassQuery(tags, area, radiusKm);
  const data = (await getJson(OVERPASS_URL, { method: "POST", body: new URLSearchParams({ data: query }), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, "OpenStreetMap's Overpass API")) as { elements?: OsmElement[] };
  const seen = new Set<string>();
  const found: FoundCompany[] = [];
  // Inside a town's boundary, a business without addr:city is in that town.
  const town = radiusKm === undefined && area.areaId !== undefined ? area.name.split(",")[0]?.trim() : undefined;
  for (const element of data.elements ?? []) {
    const company = fromOsm(element);
    if (company && !company.town && town) company.town = town;
    if (!company || seen.has(company.osmId ?? "")) continue;
    seen.add(company.osmId ?? "");
    found.push(company);
  }
  const reach = (c: FoundCompany) => Number(!!c.email) * 2 + Number(!!c.website) + Number(!!c.phone);
  return found.sort((a, b) => reach(b) - reach(a) || a.name.localeCompare(b.name));
}
