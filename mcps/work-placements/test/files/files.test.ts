import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { parseCsv, writeCsv } from "../../src/files/csv.js";
import { emlText, encodeHeader, fill, parseTemplateFile, quotedPrintable, slug, unknownPlaceholders } from "../../src/files/eml.js";
import { decodeText, mapColumns, parseStatus, rowToCompany } from "../../src/files/table.js";
import { columnIndex, columnName, readXlsx, writeXlsx } from "../../src/files/xlsx.js";
import type { Company } from "../../src/record/model.js";

const company: Company = { id: 1, name: "Café Ñandú", town: "La Orotava", email: "info@nandu.example", status: "to_contact", contacts: [], createdAt: "", updatedAt: "" };

describe("CSV", () => {
  it("reads quotes, line breaks and the delimiter Excel used", () => {
    assert.deepEqual(parseCsv('\uFEFFEmpresa;Notas\r\n"Bar ""Pepe""";"line 1\nline 2"\r\n\r\n'), [
      ["Empresa", "Notas"],
      ['Bar "Pepe"', "line 1\nline 2"],
    ]);
    assert.deepEqual(parseCsv("a,b\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("writes what it reads", () => {
    const rows = [
      ["name", "notes"],
      ["A, B", 'say "hi"'],
    ];
    assert.deepEqual(parseCsv(writeCsv(rows)), rows);
    assert.deepEqual(parseCsv(writeCsv(rows, ";")), rows);
  });

  it("reads Windows-1252 when the file isn't UTF-8", () => {
    assert.equal(decodeText(Uint8Array.from([0x4c, 0x65, 0xf3, 0x6e])), "León");
  });
});

describe("Excel", () => {
  it("names columns", () => {
    assert.equal(columnName(0), "A");
    assert.equal(columnName(27), "AB");
    assert.equal(columnIndex("AB12"), 27);
  });

  it("writes a workbook it reads back, phones kept as text", () => {
    const rows = [
      ["id", "name", "phone"],
      ["1", "Café & Co <x>", "+34 922 000 000"],
      ["2", "", "0034922"],
    ];
    const data = writeXlsx([{ name: "Companies", rows, numeric: [0] }, { name: "Contacts", rows: [["a"], ["b"]] }]);
    assert.deepEqual(readXlsx(data), rows);
    assert.deepEqual(readXlsx(data, "contacts"), [["a"], ["b"]]);
    const sheet = strFromU8(unzipSync(data)["xl/worksheets/sheet1.xml"] ?? new Uint8Array());
    assert.match(sheet, /<c r="A2"><v>1<\/v><\/c>/);
    assert.match(sheet, /<c r="C2" t="inlineStr">/);
    assert.match(sheet, /0034922/);
  });

  it("reads shared strings, as Excel itself writes them", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const xml = (s: string) => strToU8(`<?xml version="1.0"?>${s}`);
    const data = zipSync({
      "xl/workbook.xml": xml('<workbook xmlns:r="r"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      "xl/_rels/workbook.xml.rels": xml('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
      "xl/sharedStrings.xml": xml("<sst><si><t>Empresa</t></si><si><r><t>Bar </t></r><r><t>Pepe</t></r></si></sst>"),
      "xl/worksheets/sheet1.xml": xml('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="B2" t="s"><v>1</v></c><c r="C2"><v>38</v></c></row></sheetData></worksheet>'),
    });
    assert.deepEqual(readXlsx(data), [["Empresa"], ["", "Bar Pepe", "38"]]);
  });

  it("explains an old .xls", () => {
    assert.throws(() => readXlsx(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0])), /\.xls must be saved/);
  });
});

describe("imported tables", () => {
  it("recognises Spanish and English headings", () => {
    const { map, ignored } = mapColumns(["Razón social", "CIF", "Localidad", "Teléfono", "Correo electrónico", "Persona de contacto", "Otra"]);
    assert.deepEqual(map, { name: 0, taxId: 1, town: 2, phone: 3, email: 4, contactName: 5 });
    assert.deepEqual(ignored, ["Otra"]);
  });

  it("takes a mapping by hand, and says which heading is missing", () => {
    assert.equal(mapColumns(["Nom", "Ville"], { name: "nom", town: "VILLE" }).map.town, 1);
    assert.throws(() => mapColumns(["Nom"], { name: "Name" }), /no column "Name"/);
  });

  it("turns a row into a company, with its status and contact person", () => {
    const { map } = mapColumns(["Empresa", "Estado", "Contacto", "Ciclo"]);
    assert.deepEqual(rowToCompany(["Bar Pepe", "Convenio", "Ana", "SMR, DAW"], map), { name: "Bar Pepe", status: "agreement", tags: ["SMR", "DAW"], people: [{ name: "Ana" }] });
    assert.equal(parseStatus("hosting students"), "hosting");
    assert.equal(parseStatus("whatever"), undefined);
  });
});

describe("email drafts", () => {
  it("fills placeholders, with fallbacks, and lists what's missing", () => {
    assert.deepEqual(fill("To {{ name }} in {{town}}", company), { text: "To Café Ñandú in La Orotava", missing: [] });
    assert.deepEqual(fill("Dear {{contact_name}}", company), { text: "Dear ", missing: ["contact_name"] });
    assert.deepEqual(fill("Dear {{contact_name|Sir or Madam}}", company).text, "Dear Sir or Madam");
    assert.deepEqual(unknownPlaceholders("{{name}} {{nombre}}"), ["nombre"]);
  });

  it("encodes headers and the body for any mail client", () => {
    assert.equal(encodeHeader("Plain subject"), "Plain subject");
    assert.match(encodeHeader("Prácticas"), /^=\?UTF-8\?B\?.+\?=$/);
    assert.equal(quotedPrintable("a=b é"), "a=3Db =C3=A9");
    assert.ok(quotedPrintable("x".repeat(200)).split("\r\n").every((line) => line.length <= 76));
  });

  it("writes an unsent draft with its recipient and nothing to send it", () => {
    const eml = emlText({ to: "info@nandu.example", subject: "Prácticas", body: "Hola\n\nUn saludo", from: "teacher@school.example", fromName: "Ana Pérez" });
    assert.match(eml, /^From: =\?UTF-8\?B\?.+\?= <teacher@school\.example>\r\n/);
    assert.match(eml, /\r\nTo: info@nandu\.example\r\n/);
    assert.match(eml, /\r\nX-Unsent: 1\r\n/);
    assert.match(eml, /\r\n\r\nHola\r\n\r\nUn saludo\r\n$/);
  });

  it("reads a template file's subject line", () => {
    assert.deepEqual(parseTemplateFile("Asunto: Prácticas en {{name}}\n\nHola"), { subject: "Prácticas en {{name}}", body: "Hola" });
    assert.deepEqual(parseTemplateFile("Hola"), { body: "Hola" });
  });

  it("names files after companies", () => {
    assert.equal(slug("Café Ñandú, S.L."), "cafe-nandu-s-l");
  });
});
