// Sectors as OpenStreetMap tags: a word a teacher uses ("it", "hospitality") mapped to the tags that
// mark such businesses in OSM. A raw "key=value" or "key" passes as it is, for anything not listed here.

export interface Sector {
  id: string;
  label: string;
  /** OSM tags as [key, value regex or undefined for any value]. */
  tags: [string, string | undefined][];
  /** Words for a Google Places text search. */
  places: string;
}

export const SECTORS: Sector[] = [
  { id: "it", label: "IT, software and telecoms", tags: [["office", "^(it|telecommunication|software)$"], ["shop", "^(computer|mobile_phone)$"], ["craft", "^(electronics_repair|computer)$"]], places: "IT company software" },
  { id: "electrical", label: "Electrical and electronic installations", tags: [["craft", "^(electrician|electronics|electronics_repair|hvac|solar)$"], ["shop", "^(electrical|electronics)$"]], places: "electrician electrical installations" },
  { id: "automotive", label: "Vehicles: repair and sales", tags: [["shop", "^(car_repair|car|motorcycle|tyres|car_parts|motorcycle_repair)$"], ["craft", "^(car_repair|motorcycle_repair)$"]], places: "car repair workshop" },
  { id: "hospitality", label: "Hospitality and tourism", tags: [["amenity", "^(restaurant|cafe|bar|fast_food|pub)$"], ["tourism", "^(hotel|hostel|guest_house|apartment|travel_agency)$"], ["shop", "^travel_agency$"]], places: "hotel restaurant" },
  { id: "office", label: "Administration, finance and offices", tags: [["office", "^(accountant|company|consulting|financial|insurance|lawyer|tax_advisor|estate_agent|employment_agency|notary|administrative)$"]], places: "accounting firm consultancy" },
  { id: "commerce", label: "Retail and trade", tags: [["shop", "^(supermarket|department_store|clothes|hardware|doityourself|furniture|wholesale|trade)$"]], places: "shop retail" },
  { id: "health", label: "Health and care", tags: [["amenity", "^(clinic|dentist|doctors|pharmacy|veterinary|nursing_home|hospital)$"], ["healthcare", undefined], ["social_facility", undefined]], places: "clinic health centre" },
  { id: "education", label: "Education and childcare", tags: [["amenity", "^(kindergarten|childcare|language_school|music_school|driving_school|training)$"], ["office", "^educational_institution$"]], places: "school academy childcare" },
  { id: "beauty", label: "Hairdressing and beauty", tags: [["shop", "^(hairdresser|beauty|cosmetics|massage)$"]], places: "hairdresser beauty salon" },
  { id: "construction", label: "Construction and trades", tags: [["craft", "^(builder|carpenter|plumber|painter|tiler|roofer|metal_construction|glaziery|stonemason|plasterer|joiner|window_construction)$"], ["office", "^(architect|construction_company)$"]], places: "construction company builder" },
  { id: "industry", label: "Industry and manufacturing", tags: [["industrial", undefined], ["man_made", "^works$"], ["craft", "^(metal_construction|welder|cabinet_maker|printer|brewery|winery|bakery)$"]], places: "factory manufacturing" },
  { id: "food", label: "Food production and trade", tags: [["shop", "^(bakery|butcher|greengrocer|deli|pastry|seafood|cheese|wine)$"], ["craft", "^(bakery|confectionery|caterer|brewery|winery|distillery)$"]], places: "bakery food production" },
  { id: "agriculture", label: "Agriculture, gardening and environment", tags: [["shop", "^(garden_centre|agrarian|florist)$"], ["craft", "^(gardener|agricultural_engines)$"], ["landuse", "^(greenhouse_horticulture|plant_nursery)$"]], places: "garden centre nursery agriculture" },
  { id: "logistics", label: "Transport and logistics", tags: [["office", "^(logistics|moving_company|courier)$"], ["amenity", "^(post_depot)$"], ["industrial", "^(warehouse|logistics)$"]], places: "logistics transport company" },
  { id: "media", label: "Media, design and marketing", tags: [["office", "^(advertising_agency|graphic_design|newspaper|telecommunication|marketing)$"], ["craft", "^(photographer|printer|signmaker)$"], ["shop", "^(photo|copyshop)$"]], places: "advertising agency graphic design" },
  { id: "sport", label: "Sport and leisure", tags: [["leisure", "^(fitness_centre|sports_centre|sports_hall)$"], ["shop", "^(sports|bicycle)$"]], places: "gym sports centre" },
  { id: "social", label: "Social services and associations", tags: [["office", "^(association|ngo|foundation|charity)$"], ["amenity", "^(social_centre|community_centre|social_facility)$"]], places: "association NGO social services" },
];

/** The tag filters for the sectors asked: known ids, or raw "key=value" / "key". */
export function sectorTags(sectors: string[]): { tags: [string, string | undefined][]; unknown: string[] } {
  const tags: [string, string | undefined][] = [];
  const unknown: string[] = [];
  for (const raw of sectors) {
    const sector = SECTORS.find((s) => s.id === raw.trim().toLowerCase());
    if (sector) tags.push(...sector.tags);
    else if (/^[a-z_:]+(=[A-Za-z0-9_;:|-]+)?$/.test(raw.trim())) {
      const [key, value] = raw.trim().split("=");
      tags.push([key ?? raw, value ? `^(${value.replace(/[;|]/g, "|")})$` : undefined]);
    } else unknown.push(raw);
  }
  return { tags, unknown };
}

/** The sector a set of OSM tags falls in, for the result: a known id, or the main tag. */
export function sectorOf(tags: Record<string, string>): string | undefined {
  for (const sector of SECTORS) {
    for (const [key, value] of sector.tags) {
      const found = tags[key];
      if (found !== undefined && (!value || new RegExp(value).test(found))) return sector.id;
    }
  }
  for (const key of ["office", "craft", "shop", "industrial", "amenity", "tourism", "healthcare"]) if (tags[key]) return `${key}=${tags[key]}`;
  return undefined;
}
