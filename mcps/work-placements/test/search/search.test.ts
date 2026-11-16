import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fromOsm, overpassQuery, resolveArea, searchOsm } from "../../src/search/osm.js";
import { searchPlaces } from "../../src/search/places.js";
import { sectorOf, sectorTags } from "../../src/search/sectors.js";
import { fakeFetch, json } from "../helpers.js";

describe("sectors", () => {
  it("maps ids to OSM tags, and passes raw tags through", () => {
    const { tags, unknown } = sectorTags(["it", "craft=carpenter", "leisure", "made up words"]);
    assert.ok(tags.some(([k, v]) => k === "office" && v?.includes("it")));
    assert.ok(tags.some(([k, v]) => k === "craft" && v === "^(carpenter)$"));
    assert.ok(tags.some(([k, v]) => k === "leisure" && v === undefined));
    assert.deepEqual(unknown, ["made up words"]);
  });

  it("names a business's sector from its tags", () => {
    assert.equal(sectorOf({ office: "it" }), "it");
    assert.equal(sectorOf({ craft: "electrician" }), "electrical");
    assert.equal(sectorOf({ office: "yes" }), "office=yes");
  });
});

describe("OpenStreetMap", () => {
  let fake: ReturnType<typeof fakeFetch> | undefined;
  afterEach(() => fake?.restore());

  it("queries inside a boundary, or around a point", () => {
    const inside = overpassQuery([["office", "^(it)$"]], { name: "X", lat: 28.4, lon: -16.3, areaId: 3600000001 });
    assert.match(inside, /area\(id:3600000001\)->\.a;/);
    assert.match(inside, /nwr\["office"~"\^\(it\)\$"\]\["name"\]\(area\.a\);/);
    const around = overpassQuery([["craft", undefined]], { name: "28.4,-16.3", lat: 28.4, lon: -16.3 }, 2);
    assert.match(around, /nwr\["craft"\]\["name"\]\(around:2000,28\.4,-16\.3\);/);
  });

  it("reads a business's contact data from its tags", () => {
    assert.deepEqual(
      fromOsm({ type: "way", id: 7, center: { lat: 1, lon: 2 }, tags: { name: "Teide IT", office: "it", "contact:email": "info@teide.example; x@y.example", website: "https://teide.example", "addr:street": "Calle Real", "addr:housenumber": "3", "addr:city": "La Laguna" } }),
      { name: "Teide IT", source: "osm", osmId: "way/7", sector: "it", address: "Calle Real 3, La Laguna", town: "La Laguna", email: "info@teide.example", website: "https://teide.example", lat: 1, lon: 2 },
    );
    assert.equal(fromOsm({ type: "node", id: 1, tags: { office: "it" } }), undefined);
  });

  it("looks a town up, then searches it, best reachable first", async () => {
    fake = fakeFetch({
      "https://nominatim.openstreetmap.org/search": () => json([{ lat: "28.48", lon: "-16.31", osm_type: "relation", osm_id: 12345, display_name: "San Cristóbal de La Laguna, Santa Cruz de Tenerife, España" }]),
      "https://overpass-api.de/api/interpreter": () =>
        json({
          elements: [
            { type: "node", id: 1, lat: 1, lon: 1, tags: { name: "No contact", office: "it" } },
            { type: "node", id: 2, lat: 1, lon: 1, tags: { name: "Reachable", office: "it", email: "info@r.example" } },
            { type: "node", id: 2, lat: 1, lon: 1, tags: { name: "Reachable", office: "it", email: "info@r.example" } },
          ],
        }),
    });
    const area = await resolveArea("La Laguna");
    assert.equal(area.areaId, 3600012345);
    const found = await searchOsm([["office", "^(it)$"]], area);
    assert.deepEqual(
      found.map((f) => f.name),
      ["Reachable", "No contact"],
    );
    const body = String(fake.calls[1]?.init?.body);
    assert.match(decodeURIComponent(body), /area\(id:3600012345\)/);
  });

  it("says when Overpass is busy, and when a place doesn't exist", async () => {
    fake = fakeFetch({
      "https://nominatim.openstreetmap.org/search": () => json([]),
      "https://overpass-api.de/api/interpreter": () => json({}, 429),
    });
    await assert.rejects(resolveArea("Nowhere at all"), /No place called "Nowhere at all"/);
    await assert.rejects(searchOsm([["office", undefined]], { name: "p", lat: 0, lon: 0 }), /busy right now/);
  });
});

describe("Google Places", () => {
  let fake: ReturnType<typeof fakeFetch> | undefined;
  afterEach(() => fake?.restore());

  it("sends the key in a header and keeps the place id", async () => {
    fake = fakeFetch({ "https://places.googleapis.com/": () => json({ places: [{ id: "ChIJ1", displayName: { text: "Teide IT" }, websiteUri: "https://teide.example" }] }) });
    const found = await searchPlaces("IT company in La Laguna", "KEY", "it");
    assert.deepEqual(found, [{ name: "Teide IT", source: "places", placeId: "ChIJ1", sector: "it", website: "https://teide.example" }]);
    assert.equal((fake.calls[0]?.init?.headers as Record<string, string>)["X-Goog-Api-Key"], "KEY");
    assert.doesNotMatch(fake.calls[0]?.url ?? "", /KEY/);
  });

  it("explains a refused key", async () => {
    fake = fakeFetch({ "https://places.googleapis.com/": () => json({ error: { message: "API key not valid" } }, 400) });
    await assert.rejects(searchPlaces("x", "BAD"), /refused the key \(HTTP 400: API key not valid\)/);
  });
});
