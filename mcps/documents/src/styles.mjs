// A template's styles: read them from word/styles.xml, find which one plays each role (heading 1, list, table…)
// by its built-in name, its localized name or its id, and add the built-in ones a document needs and it lacks.
import { attr, child, children, parseXml, val } from "./xml.mjs";

/** Lowercase, without accents or spaces: "Título 1" → "titulo1". */
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_-]+/g, "");

/** The roles a Markdown document needs, with the names (built-in and localized) and ids that play each. */
const ALIASES = {
  title: ["title", "titulo", "titre", "titel", "titolo"],
  subtitle: ["subtitle", "subtitulo", "soustitre", "untertitel", "sottotitolo"],
  paragraph: ["normal", "standard", "standaard"],
  listBullet: ["list bullet", "lista con vinetas", "listavineta", "listebullet", "aufzahlungszeichen", "listapuntata"],
  listNumber: ["list number", "lista con numeros", "listanumero", "listenummer", "listenumero", "listanumerata"],
  listParagraph: ["list paragraph", "parrafo de lista", "listenabsatz", "paragraphedeliste", "paragrafoelenco"],
  quote: ["quote", "cita", "zitat", "citation", "citazione"],
  code: ["html preformatted", "html con formato previo", "code", "codigo", "source text", "texto preformateado", "preformatted text", "codice"],
  caption: ["caption", "descripcion", "epigrafe", "leyenda", "beschriftung", "legende", "didascalia"],
  table: ["table grid", "tabla con cuadricula", "cuadricula de tabla", "tabellenraster", "grilledutableau", "grigliatabella"],
  hyperlink: ["hyperlink", "hipervinculo", "lienhypertexte", "collegamentoipertestuale"],
};
const HEADING_WORDS = ["heading", "titulo", "encabezado", "uberschrift", "titre", "titolo", "kop"];

export const ROLES = ["title", "subtitle", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "paragraph", "listBullet", "listNumber", "listParagraph", "quote", "code", "caption", "table", "hyperlink"];

const KIND = { table: "table", hyperlink: "character" };
const kindOf = (role) => KIND[role] ?? "paragraph";

/** Reads word/styles.xml into a list of styles and the document defaults. */
export function readStyles(xml) {
  const list = [];
  if (!xml) return { list, byId: new Map() };
  const doc = parseXml(xml, "word/styles.xml");
  for (const s of children(doc.documentElement, "w:style")) {
    const pPr = child(s, "w:pPr");
    const numPr = child(pPr, "w:numPr");
    list.push({
      id: attr(s, "w:styleId"),
      name: val(s, "w:name") ?? attr(s, "w:styleId"),
      type: attr(s, "w:type") ?? "paragraph",
      isDefault: ["1", "true", "on"].includes(attr(s, "w:default") ?? ""),
      basedOn: val(s, "w:basedOn"),
      custom: ["1", "true", "on"].includes(attr(s, "w:customStyle") ?? ""),
      hidden: !!(child(s, "w:hidden") || child(s, "w:semiHidden")),
      outlineLvl: val(pPr, "w:outlineLvl") == null ? null : Number(val(pPr, "w:outlineLvl")),
      numId: numPr ? val(numPr, "w:numId") : null,
      ilvl: numPr ? Number(val(numPr, "w:ilvl") ?? 0) : null,
    });
  }
  return { list, byId: new Map(list.map((s) => [s.id, s])) };
}

/** A property of a style, its own or inherited through basedOn. */
export function inherited(styles, id, key) {
  const seen = new Set();
  for (let s = styles.byId.get(id); s && !seen.has(s.id); s = styles.byId.get(s.basedOn)) {
    seen.add(s.id);
    if (s[key] != null) return s[key];
  }
  return null;
}

/** The heading level (1-9) a paragraph style stands for, or null. */
export function headingLevel(styles, id) {
  const s = styles.byId.get(id);
  if (!s || s.type !== "paragraph") return null;
  const n = norm(s.name);
  for (const word of HEADING_WORDS) {
    const m = n.match(new RegExp(`^${word}(\\d)$`));
    if (m) return Number(m[1]);
  }
  const m = norm(s.id).match(/^(heading|titulo|ttulo|encabezado|berschrift|titre|titolo|kop)(\d)$/);
  if (m) return Number(m[2]);
  const lvl = inherited(styles, id, "outlineLvl");
  return lvl != null && lvl < 9 && !s.isDefault ? lvl + 1 : null;
}

/** Finds the style that plays each role in this template; null where none does. */
export function mapRoles(styles) {
  const paragraphs = styles.list.filter((s) => s.type === "paragraph");
  const byName = (role, type) => {
    const names = ALIASES[role].map(norm);
    return styles.list.find((s) => s.type === type && names.includes(norm(s.name))) ?? styles.list.find((s) => s.type === type && names.includes(norm(s.id))) ?? null;
  };
  const roles = {};
  for (const role of ROLES) {
    if (role.startsWith("heading")) {
      const level = Number(role.slice(7));
      const exact = paragraphs.filter((s) => headingLevel(styles, s.id) === level);
      // A built-in or localized heading name first, then a style whose outline level says so.
      const named = (s) => (HEADING_WORDS.some((w) => new RegExp(`^${w}\\d$`).test(norm(s.name))) ? 0 : 1);
      roles[role] = exact.sort((a, b) => named(a) - named(b) || Number(a.custom) - Number(b.custom))[0]?.id ?? null;
      continue;
    }
    if (role === "paragraph") {
      roles[role] = paragraphs.find((s) => s.isDefault)?.id ?? byName(role, "paragraph")?.id ?? null;
      continue;
    }
    if (role === "table") {
      const normalTable = (s) => ["normaltable", "tablanormal", "tableaunormal", "normaletabelle", "tabellanormale"].includes(norm(s.name));
      const tables = styles.list.filter((s) => s.type === "table" && !normalTable(s));
      roles[role] = byName(role, "table")?.id ?? tables.find((s) => s.isDefault)?.id ?? tables.find((s) => s.custom)?.id ?? null;
      continue;
    }
    roles[role] = byName(role, kindOf(role))?.id ?? null;
  }
  return roles;
}

/** The built-in definitions added when a template lacks a style the document uses. */
export function builtIn(role, id, normal) {
  const based = normal ? `<w:basedOn w:val="${normal}"/><w:next w:val="${normal}"/>` : "";
  const heading = role.match(/^heading(\d)$/);
  if (heading) {
    const level = Number(heading[1]);
    const size = [32, 28, 26, 24, 22, 22][level - 1];
    return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="heading ${level}"/>${based}<w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${level === 1 ? 360 : 240}" w:after="120"/><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/>${level >= 4 ? "<w:i/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
  }
  switch (role) {
    case "title":
      return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="Title"/>${based}<w:uiPriority w:val="10"/><w:qFormat/><w:pPr><w:spacing w:after="240"/><w:contextualSpacing/></w:pPr><w:rPr><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr></w:style>`;
    case "subtitle":
      return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="Subtitle"/>${based}<w:uiPriority w:val="11"/><w:qFormat/><w:rPr><w:color w:val="595959"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>`;
    case "paragraph":
      return `<w:style w:type="paragraph" w:default="1" w:styleId="${id}"><w:name w:val="Normal"/><w:qFormat/></w:style>`;
    case "listParagraph":
    case "listBullet":
    case "listNumber":
      return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="List Paragraph"/>${normal ? `<w:basedOn w:val="${normal}"/>` : ""}<w:uiPriority w:val="34"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>`;
    case "quote":
      return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="Quote"/>${based}<w:uiPriority w:val="29"/><w:qFormat/><w:pPr><w:ind w:left="720" w:right="720"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="404040"/></w:rPr></w:style>`;
    case "code":
      return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="HTML Preformatted"/>${normal ? `<w:basedOn w:val="${normal}"/>` : ""}<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>`;
    case "caption":
      return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="caption"/>${based}<w:uiPriority w:val="35"/><w:qFormat/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:i/><w:iCs/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>`;
    case "table":
      return `<w:style w:type="table" w:styleId="${id}"><w:name w:val="Table Grid"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:bCs/></w:rPr></w:tblStylePr></w:style>`;
    case "hyperlink":
      return `<w:style w:type="character" w:styleId="${id}"><w:name w:val="Hyperlink"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>`;
    default:
      return null;
  }
}

const BUILT_IN_ID = { title: "Title", subtitle: "Subtitle", paragraph: "Normal", listBullet: "ListParagraph", listNumber: "ListParagraph", listParagraph: "ListParagraph", quote: "Quote", code: "HTMLPreformatted", caption: "Caption", table: "TableGrid", hyperlink: "Hyperlink" };

/**
 * Which style each role uses in one document: the person's choice (by id or name), else the template's own,
 * else a built-in one added to styles.xml. Tracks what is used and what is added, for the report.
 */
export class StylePlan {
  constructor(styles, overrides = {}) {
    this.styles = styles;
    this.found = mapRoles(styles);
    this.chosen = {};
    this.added = new Map();
    this.used = new Map();
    this.warnings = [];
    for (const [role, wanted] of Object.entries(overrides ?? {})) {
      if (!ROLES.includes(role)) throw new Error(`Unknown style role "${role}". Roles: ${ROLES.join(", ")}.`);
      const s = styles.byId.get(wanted) ?? styles.list.find((x) => norm(x.name) === norm(wanted)) ?? styles.list.find((x) => norm(x.id) === norm(wanted));
      if (!s) throw new Error(`The template has no style "${wanted}" (for ${role}). read_template lists its styles.`);
      if (s.type !== kindOf(role)) throw new Error(`"${wanted}" is a ${s.type} style, but ${role} needs a ${kindOf(role)} style.`);
      this.chosen[role] = s.id;
    }
  }

  /** The style id for a role, adding a built-in definition when the template has none. */
  id(role) {
    let id = this.chosen[role] ?? this.found[role];
    if (!id && (role === "listBullet" || role === "listNumber")) id = this.chosen.listParagraph ?? this.found.listParagraph;
    if (!id) {
      const heading = role.match(/^heading(\d)$/);
      let wanted = heading ? `Heading${heading[1]}` : BUILT_IN_ID[role];
      if (role === "listBullet" || role === "listNumber") role = "listParagraph";
      const existing = [...this.added.values()].find((a) => a.role === role);
      if (existing) id = existing.id;
      else {
        while (this.styles.byId.has(wanted)) wanted += "X";
        id = wanted;
        const normal = role === "paragraph" ? null : this.id("paragraph");
        this.added.set(id, { id, role, xml: builtIn(role, id, normal) });
      }
    }
    this.used.set(role, id);
    return id;
  }

  /** The name a style shows in Word. */
  name(id) {
    const s = this.styles.byId.get(id);
    if (s) return s.name;
    const added = this.added.get(id);
    return added ? (added.xml.match(/<w:name w:val="([^"]*)"/)?.[1] ?? id) : id;
  }

  /** Adds the built-in styles used to styles.xml (or writes a new one). */
  apply(xml) {
    const additions = [...this.added.values()].map((a) => a.xml).join("");
    if (!xml) return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${additions}</w:styles>`;
    if (!additions) return xml;
    const end = xml.lastIndexOf("</w:styles>");
    if (end < 0) throw new Error("word/styles.xml has no closing </w:styles>.");
    return xml.slice(0, end) + additions + xml.slice(end);
  }
}
