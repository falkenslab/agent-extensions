// A small Excel (.xlsx) writer and reader, enough for a table of companies: one sheet per table, text and
// numbers, a bold header row. An .xlsx is a zip of XML files; fflate (pure JavaScript, bundled) zips it.
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export interface Sheet {
  name: string;
  rows: string[][];
  /** Columns written as numbers (ids, counts); every other cell is text, so a phone keeps its leading zero or plus. */
  numeric?: number[];
}

const escapeXml = (s: string) =>
  s
    // Characters XML 1.0 can't hold.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** A column's letters from its index: 0 is A, 26 is AA. */
export function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/** A column's index from a cell reference like "AB12". */
export function columnIndex(reference: string): number {
  let index = 0;
  for (const char of reference.replace(/\d+$/, "").toUpperCase()) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function sheetXml({ rows, numeric = [] }: Sheet): string {
  const widths = (rows[0] ?? []).map((_, c) => Math.min(60, Math.max(8, ...rows.map((r) => (r[c] ?? "").length + 2))));
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const data = rows
    .map((row, r) => {
      const cells = row
        .map((value, c) => {
          if (value === "") return "";
          const ref = `${columnName(c)}${r + 1}`;
          const style = r === 0 ? ' s="1"' : "";
          if (r > 0 && numeric.includes(c) && /^-?\d+(\.\d+)?$/.test(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const freeze = rows.length > 1 ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${data}</sheetData></worksheet>`;
}

export function writeXlsx(sheets: Sheet[]): Uint8Array {
  const names = sheets.map((s) => s.name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31));
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>',
    ),
  };
  sheets.forEach((sheet, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sheet))));
  // A fixed date in the zip entries: the same table gives the same file.
  return zipSync(files, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });
}

const unescapeXml = (s: string) =>
  s.replace(/&(lt|gt|quot|apos|amp|#x[0-9a-f]+|#\d+);/gi, (_, e: string) => {
    const map: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };
    if (e[0] === "#") return String.fromCodePoint(e[1]?.toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10));
    return map[e.toLowerCase()] ?? "";
  });

/** The text of every <t> inside a string item or an inline string (rich text has several). */
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1] ?? "")).join("");

/** The first sheet's rows (or the sheet named), as text. Dates stay as Excel's serial numbers. */
export function readXlsx(data: Uint8Array, sheetName?: string): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new Error("This isn't an .xlsx file (an Excel workbook); an old .xls must be saved as .xlsx or CSV first.");
  }
  const text = (name: string) => (files[name] ? strFromU8(files[name]) : undefined);
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("This .xlsx has no workbook inside.");
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ name: unescapeXml(m[0].match(/name="([^"]*)"/)?.[1] ?? ""), rid: m[0].match(/r:id="([^"]*)"/)?.[1] ?? "" }));
  const sheet = sheetName ? sheets.find((s) => s.name.toLowerCase() === sheetName.toLowerCase()) : sheets[0];
  if (!sheet) throw new Error(`No sheet called "${sheetName}"; it has ${sheets.map((s) => `"${s.name}"`).join(", ")}.`);
  const rels = text("xl/_rels/workbook.xml.rels") ?? "";
  const target = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${sheet.rid}"`))?.match(/Target="([^"]*)"/)?.[1];
  const path = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target}`) : "xl/worksheets/sheet1.xml";
  const xml = text(path);
  if (!xml) throw new Error(`The sheet "${sheet.name}" can't be found inside the file.`);
  const shared = [...(text("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1] ?? ""));

  const rows: string[][] = [];
  for (const [, rowAttributes = "", rowXml = ""] of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const r = Number(rowAttributes.match(/\br="(\d+)"/)?.[1] ?? rows.length + 1) - 1;
    const row: string[] = [];
    for (const [, cellAttributes = "", cellXml = ""] of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = cellAttributes.match(/\br="([A-Z]+\d+)"/)?.[1];
      const c = ref ? columnIndex(ref) : row.length;
      const type = cellAttributes.match(/\bt="([^"]*)"/)?.[1];
      const v = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = texts(cellXml);
      else if (v !== undefined) value = unescapeXml(v);
      while (row.length < c) row.push("");
      row[c] = value;
    }
    while (rows.length < r) rows.push([]);
    rows[r] = row;
  }
  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}
