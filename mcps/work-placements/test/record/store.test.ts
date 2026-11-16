import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { normalizeName, type RecordFile } from "../../src/record/model.js";
import { DuplicateError, addCompany, changeRecord, filterCompanies, findDuplicate, logContact, readRecord, summarize, updateCompany } from "../../src/record/store.js";

const empty = (): RecordFile => ({ version: 1, nextId: 1, companies: [] });

describe("the record", () => {
  it("normalizes names without accents, punctuation or legal forms", () => {
    assert.equal(normalizeName("Informática Teide, S.L."), "informatica teide");
    assert.equal(normalizeName("INFORMATICA TEIDE SL"), "informatica teide");
    assert.equal(normalizeName("Talleres Pérez S. A."), "talleres perez");
  });

  it("finds duplicates by tax id, or by name and town", () => {
    const record = empty();
    addCompany(record, { name: "Informática Teide SL", town: "La Laguna", taxId: "B-38.123.456" });
    assert.match(findDuplicate(record.companies, { name: "Other name", taxId: "b38123456" })?.reason ?? "", /tax id/);
    assert.match(findDuplicate(record.companies, { name: "INFORMATICA TEIDE, S.L.", town: "la laguna" })?.reason ?? "", /name and town/);
    assert.equal(findDuplicate(record.companies, { name: "Informática Teide", town: "Adeje" }), undefined);
  });

  it("refuses a duplicate unless allowed, naming the one it repeats", () => {
    const record = empty();
    addCompany(record, { name: "Bar Pepe", town: "Arona" });
    assert.throws(() => addCompany(record, { name: "Bar Pepe", town: "Arona" }), (e: unknown) => e instanceof DuplicateError && /#1 "Bar Pepe"/.test(e.message));
    assert.equal(addCompany(record, { name: "Bar Pepe", town: "Arona" }, { allowDuplicate: true }).id, 2);
  });

  it("updates and clears fields, and won't make one repeat another", () => {
    const record = empty();
    addCompany(record, { name: "A", town: "X", phone: "922000000" });
    addCompany(record, { name: "B", town: "X" });
    const updated = updateCompany(record, 1, { email: "info@a.example", status: "interested" }, ["phone"]);
    assert.equal(updated.email, "info@a.example");
    assert.equal(updated.phone, undefined);
    assert.equal(updated.status, "interested");
    assert.throws(() => updateCompany(record, 2, { name: "A" }), DuplicateError);
    assert.throws(() => updateCompany(record, 9, { notes: "x" }), /no company #9/);
  });

  it("logs contacts, moves to_contact to contacted, and finds what's due", () => {
    const record = empty();
    addCompany(record, { name: "A" });
    addCompany(record, { name: "B" });
    addCompany(record, { name: "C", status: "declined" });
    logContact(record, 1, { date: "2026-11-02", channel: "email", summary: "Sent the letter", nextStep: "Call", nextStepDate: "2026-11-10" });
    logContact(record, 2, { date: "2026-10-01", channel: "phone", summary: "Will think" }, "interested");
    logContact(record, 3, { date: "2026-11-01", channel: "phone", summary: "No", nextStepDate: "2026-11-01" });
    assert.equal(record.companies[0]?.status, "contacted");
    assert.equal(record.companies[1]?.status, "interested");
    assert.deepEqual(
      filterCompanies(record.companies, { dueBy: "2026-11-16" }).map((c) => c.name),
      ["A"],
    );
    const summary = summarize(record.companies, { today: "2026-11-16" });
    assert.deepEqual(summary.overdue.map((s) => s.name), ["A"]);
    assert.deepEqual(summary.stale.map((s) => s.name), ["B"]);
    assert.equal(summary.byStatus.declined, 1);
  });

  it("writes the file atomically and reads it back", () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "record-")), "sub", "record.json");
    changeRecord((record) => addCompany(record, { name: "A" }), file);
    assert.equal(readRecord(file).companies[0]?.name, "A");
    assert.deepEqual(readdirSync(path.dirname(file)), ["record.json"], "no temporary file left");
  });

  it("refuses to work on a broken file instead of overwriting it", () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "record-")), "record.json");
    writeFileSync(file, "{ not json");
    assert.throws(() => changeRecord((record) => addCompany(record, { name: "A" }), file), /can't be read/);
    assert.ok(existsSync(file));
  });
});
