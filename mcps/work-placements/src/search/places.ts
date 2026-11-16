// Google Places (the Places API's Text Search), with the person's own key. Google's terms limit what may
// be stored: the record keeps only a result's place_id; the rest is shown, and kept only once the person
// confirms it or it comes from the company's own site.
import type { FoundCompany } from "./osm.js";

export const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELDS = ["places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber", "places.websiteUri", "places.primaryTypeDisplayName"].join(",");

interface Place {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  primaryTypeDisplayName?: { text?: string };
}

/** One text search ("IT company in La Laguna"), up to 20 places. */
export async function searchPlaces(text: string, key: string, sector?: string): Promise<FoundCompany[]> {
  let response: Response;
  try {
    response = await fetch(PLACES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
      body: JSON.stringify({ textQuery: text, pageSize: 20 }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`Google Places couldn't be reached (${(error as Error).message}).`, { cause: error });
  }
  if (response.status === 400 || response.status === 403) {
    const detail = ((await response.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
    throw new Error(`Google Places refused the key (HTTP ${response.status}${detail ? `: ${detail}` : ""}). Check that the key is right and has the Places API (New) enabled.`);
  }
  if (!response.ok) throw new Error(`Google Places answered HTTP ${response.status}.`);
  const data = (await response.json()) as { places?: Place[] };
  return (data.places ?? []).flatMap((place) => {
    const name = place.displayName?.text;
    if (!name) return [];
    const found: FoundCompany = { name, source: "places", placeId: place.id };
    const sectorText = sector ?? place.primaryTypeDisplayName?.text;
    if (sectorText) found.sector = sectorText;
    if (place.formattedAddress) found.address = place.formattedAddress;
    if (place.nationalPhoneNumber) found.phone = place.nationalPhoneNumber;
    if (place.websiteUri) found.website = place.websiteUri;
    return [found];
  });
}
