import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { readXlsx } from "../../src/files/xlsx.js";
import { connect, fakeFetch, freshFolders, html, json, structured, text, textOf } from "../helpers.js";

type Company = { id: number; name: string; status: string; email?: string; contacts: unknown[] };

describe("the tools", () => {
  let folders: { data: string; output: string };
  let fake: ReturnType<typeof fakeFetch> | undefined;
  beforeEach(() => void (folders = freshFolders()));
  afterEach(() => fake?.restore());

  it("searches OSM, marks what's in the record, and leaves Places out without a key", async () => {
    fake = fakeFetch({
      "https://nominatim.openstreetmap.org/": () => json([{ lat: "28.4", lon: "-16.3", osm_type: "node", osm_id: 1, display_name: "Tacoronte" }]),
      "https://overpass-api.de/": () =>
        json({
          elements: [
            { type: "node", id: 10, lat: 1, lon: 1, tags: { name: "Known SL", office: "it", "addr:city": "Tacoronte" } },
            { type: "node", id: 11, lat: 1, lon: 1, tags: { name: "New One", office: "it", website: "https://new.example" } },
          ],
        }),
    });
    const client = await connect();
    await client.callTool({ name: "add_company", arguments: { name: "Known", town: "Tacoronte" } });
    const result = structured<{ companies: { name: string; inRecord?: number }[]; places: string; attribution: string }>(await client.callTool({ name: "search_companies", arguments: { sectors: ["it"], area: "Tacoronte" } }));
    assert.deepEqual(
      result.companies.map((c) => [c.name, c.inRecord]),
      [
        ["New One", undefined],
        ["Known SL", 1],
      ],
    );
    assert.match(result.places, /no Google Places key/);
    assert.match(result.attribution, /OpenStreetMap contributors/);
    assert.ok(fake.calls.every((c) => !c.url.includes("googleapis")));
  });

  it("searches Places too with a key, and asks for an area when there's none", async () => {
    process.env.WORK_PLACEMENTS_PLACES_KEY = "KEY";
    process.env.WORK_PLACEMENTS_AREA = "28.4,-16.3";
    fake = fakeFetch({
      "https://overpass-api.de/": () => json({ elements: [] }),
      "https://places.googleapis.com/": () => json({ places: [{ id: "P1", displayName: { text: "From Places" } }] }),
    });
    const client = await connect();
    const result = structured<{ companies: { name: string; placeId?: string }[] }>(await client.callTool({ name: "search_companies", arguments: { sectors: ["it"] } }));
    assert.deepEqual(result.companies, [{ name: "From Places", source: "places", placeId: "P1", sector: "it" }]);
    delete process.env.WORK_PLACEMENTS_AREA;
    const missing = await client.callTool({ name: "search_companies", arguments: { sectors: ["it"] } });
    assert.equal(missing.isError, true);
    assert.match(textOf(missing), /Say where to search/);
  });

  it("refuses a duplicate, and follows a company from contact to due follow-up", async () => {
    const client = await connect();
    const added = structured<{ company: Company }>(await client.callTool({ name: "add_company", arguments: { name: "Bar Pepe", town: "Arona", email: "info@pepe.example" } }));
    assert.equal(added.company.status, "to_contact");
    const again = await client.callTool({ name: "add_company", arguments: { name: "BAR PEPE S.L.", town: "arona" } });
    assert.equal(again.isError, true);
    assert.match(textOf(again), /Already in the record as #1/);

    const logged = structured<{ company: Company }>(await client.callTool({ name: "log_contact", arguments: { id: 1, channel: "email", summary: "Sent the letter", date: "2026-01-10", nextStep: "Call them", nextStepDate: "2026-01-20" } }));
    assert.equal(logged.company.status, "contacted");
    const due = structured<{ companies: { name: string; nextStep?: string }[] }>(await client.callTool({ name: "list_companies", arguments: { due: true } }));
    assert.deepEqual(due.companies.map((c) => [c.name, c.nextStep]), [["Bar Pepe", "Call them"]]);
    const summary = structured<{ overdue: unknown[]; byStatus: Record<string, number> }>(await client.callTool({ name: "pipeline_summary", arguments: {} }));
    assert.equal(summary.overdue.length, 1);
    assert.equal(summary.byStatus.contacted, 1);

    const updated = structured<{ company: Company }>(await client.callTool({ name: "update_company", arguments: { id: 1, status: "agreement", clear: ["email"] } }));
    assert.deepEqual([updated.company.status, updated.company.email], ["agreement", undefined]);
    const one = structured<{ company: Company }>(await client.callTool({ name: "list_companies", arguments: { id: 1 } }));
    assert.equal(one.company.contacts.length, 1);
  });

  it("imports a spreadsheet: tried first, duplicates skipped", async () => {
    const file = path.join(folders.output, "..", "empresas.csv");
    writeFileSync(file, "Empresa;Localidad;Correo;Estado\nBar Pepe;Arona;info@pepe.example;Convenio\nBar Pepe SL;Arona;;\n;Adeje;x@y.example;\nTaller Ruiz;Adeje;;\n", "utf8");
    const client = await connect();
    const tried = structured<{ added: { id?: number; name: string }[]; duplicates: { row: number; existing: number }[]; skipped: { row: number }[]; columns: Record<string, string> }>(
      await client.callTool({ name: "import_companies", arguments: { path: file, dryRun: true, tags: ["SMR"] } }),
    );
    assert.deepEqual(tried.added.map((a) => a.name), ["Bar Pepe", "Taller Ruiz"]);
    assert.equal(tried.added[0]?.id, undefined);
    assert.deepEqual(tried.duplicates.map((d) => d.row), [3]);
    assert.deepEqual(tried.skipped.map((s) => s.row), [4]);
    assert.deepEqual(tried.columns, { name: "Empresa", town: "Localidad", email: "Correo", status: "Estado" });
    assert.equal(structured<{ total: number }>(await client.callTool({ name: "list_companies", arguments: {} })).total, 0, "a dry run changes nothing");

    await client.callTool({ name: "import_companies", arguments: { path: file, tags: ["SMR"] } });
    const listed = structured<{ companies: { name: string; status: string; tags?: string[] }[] }>(await client.callTool({ name: "list_companies", arguments: { tag: "smr" } }));
    assert.deepEqual(listed.companies.map((c) => [c.name, c.status]), [["Bar Pepe", "agreement"], ["Taller Ruiz", "to_contact"]]);
  });

  it("exports to Excel and CSV, people only when asked, never overwriting", async () => {
    const client = await connect();
    await client.callTool({ name: "add_company", arguments: { name: "Bar Pepe", phone: "+34 922 000 000", people: [{ name: "Ana Pérez", role: "Owner" }] } });
    await client.callTool({ name: "log_contact", arguments: { id: 1, channel: "phone", summary: "Called", person: "Ana Pérez" } });
    const first = structured<{ path: string; contacts: number }>(await client.callTool({ name: "export_companies", arguments: {} }));
    const second = structured<{ path: string }>(await client.callTool({ name: "export_companies", arguments: {} }));
    assert.notEqual(first.path, second.path);
    const rows = readXlsx(readFileSync(first.path));
    assert.deepEqual(rows[0]?.slice(0, 3), ["id", "name", "status"]);
    assert.equal(rows[1]?.[rows[0]?.indexOf("phone") ?? -1], "+34 922 000 000");
    assert.doesNotMatch(JSON.stringify(rows), /Ana/);
    assert.doesNotMatch(JSON.stringify(readXlsx(readFileSync(first.path), "Contacts")), /Ana/);
    assert.equal(first.contacts, 1);
    const csv = structured<{ path: string }>(await client.callTool({ name: "export_companies", arguments: { format: "csv", people: true, delimiter: ";" } }));
    assert.match(readFileSync(csv.path, "utf8"), /^\uFEFFid;name;status;.*contact person/);
    assert.match(readFileSync(csv.path, "utf8"), /Ana Pérez/);
  });

  it("writes one unsent draft per company with an email, and lists the others", async () => {
    const client = await connect();
    await client.callTool({ name: "add_company", arguments: { name: "Café Ñandú", town: "La Orotava", email: "info@nandu.example" } });
    await client.callTool({ name: "add_company", arguments: { name: "No Email", town: "Adeje" } });
    await client.callTool({ name: "add_company", arguments: { name: "No Town", email: "hola@notown.example" } });
    const result = structured<{ dir: string; drafts: { id: number; path: string; to: string }[]; skipped: { id: number; reason: string }[] }>(
      await client.callTool({ name: "draft_emails", arguments: { companyIds: [1, 2, 3, 9], subject: "Prácticas en {{name}}", body: "Hola, equipo de {{name}} ({{town}}).\n\nSi no desean más correos, respondan BAJA.", from: "ana@school.example" } }),
    );
    assert.deepEqual(result.drafts.map((d) => [d.id, d.to]), [[1, "info@nandu.example"]]);
    assert.deepEqual(result.skipped.map((s) => s.id), [2, 3, 9]);
    assert.match(result.skipped[1]?.reason ?? "", /\{\{town\}\}/);
    const eml = readFileSync(result.drafts[0]?.path ?? "", "utf8");
    assert.match(eml, /X-Unsent: 1/);
    assert.match(eml, /To: info@nandu\.example/);
    assert.deepEqual(readdirSync(result.dir), ["cafe-nandu.eml"]);

    const unknown = await client.callTool({ name: "draft_emails", arguments: { companyIds: [1], subject: "x", body: "{{nombre}}" } });
    assert.match(textOf(unknown), /Unknown placeholders: \{\{nombre\}\}/);
    const none = await client.callTool({ name: "draft_emails", arguments: { companyIds: [1], subject: "x" } });
    assert.match(textOf(none), /template is needed/);
  });

  it("reads a company's site from the record", async () => {
    fake = fakeFetch({
      "https://pepe.example/robots.txt": () => text("", 404),
      "https://pepe.example/": () => html("<title>Bar Pepe</title><p>Escríbenos: info@pepe.example</p>"),
    });
    const client = await connect();
    await client.callTool({ name: "add_company", arguments: { name: "Bar Pepe", website: "pepe.example" } });
    const report = structured<{ emails: { address: string }[]; title: string }>(await client.callTool({ name: "read_company_site", arguments: { companyId: 1 } }));
    assert.equal(report.title, "Bar Pepe");
    assert.deepEqual(report.emails.map((e) => e.address), ["info@pepe.example"]);
  });
});
