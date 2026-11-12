// The .docx work: read a template, write a document from it and Markdown, and read a document back.
// The template stays whole (styles, header, footer, logo, page setup); only its body is replaced, or filled at {{content}}.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defaultTemplate } from "./default-template.mjs";
import { markdownToBody, sizeEmu } from "./markdown.mjs";
import { headingLevel, inherited, mapRoles, ROLES, readStyles, StylePlan } from "./styles.mjs";
import { attr, bytes, child, children, closest, CONTENT_TYPE, descendants, esc, mainPart, NS, openZip, parseXml, readRels, REL, relsPath, resolveTarget, saveZip, serializeXml, text, val } from "./xml.mjs";

const PLACEHOLDER = /\{\{\s*([^{}]{1,80}?)\s*\}\}/g;
const MARKER = "content";
const TWIP_CM = 567;
const cm = (twips) => Math.round((Number(twips) / TWIP_CM) * 100) / 100;

// ---------------------------------------------------------------- opening

/** Opens a template (.docx or .dotx) or the built-in clean document. */
export function openTemplate(file) {
  if (!file) return { files: defaultTemplate(), source: "built-in" };
  const absolute = mustBeAbsolute(file, "template");
  if (!existsSync(absolute)) throw new Error(`No template at ${absolute}.`);
  const ext = path.extname(absolute).toLowerCase();
  if (ext === ".docm" || ext === ".dotm") throw new Error("Macro-enabled templates (.docm, .dotm) aren't supported: save the template as .docx or .dotx in Word first.");
  if (ext !== ".docx" && ext !== ".dotx") throw new Error(`The template must be a .docx or .dotx, not ${ext || "a file without extension"}. A .doc must be saved as .docx in Word or LibreOffice first.`);
  return { files: openZip(readFileSync(absolute), absolute), source: absolute };
}

function mustBeAbsolute(file, what) {
  if (!path.isAbsolute(file)) throw new Error(`The ${what} path must be absolute: ${file}`);
  return path.normalize(file);
}

/** The parts of an opened package the tools work with. */
function load(files) {
  const main = mainPart(files);
  const xml = text(files, main);
  if (!xml) throw new Error(`The package names ${main} as its document, but it isn't there.`);
  const doc = parseXml(xml, main);
  const body = child(doc.documentElement, "w:body");
  if (!body) throw new Error(`${main} has no body.`);
  const rels = readRels(files, main);
  const stylesRel = rels.find((r) => r.type === REL.styles);
  const stylesPart = stylesRel ? resolveTarget(main, stylesRel.target) : "word/styles.xml";
  const styles = readStyles(text(files, stylesPart));
  const sectPr = children(body, "w:sectPr").at(-1) ?? null;
  const headerFooter = rels.filter((r) => r.type === REL.header || r.type === REL.footer).map((r) => ({ id: r.id, kind: r.type === REL.header ? "header" : "footer", part: resolveTarget(main, r.target) }));
  return { main, doc, body, rels, stylesPart, styles, sectPr, headerFooter };
}

/** Page size and margins from a section's properties (A4 and 2.5 cm when missing). */
function page(sectPr) {
  const pgSz = child(sectPr, "w:pgSz");
  const pgMar = child(sectPr, "w:pgMar");
  const n = (node, name, fallback) => Number(attr(node, name) ?? fallback);
  const p = {
    width: n(pgSz, "w:w", 11906),
    height: n(pgSz, "w:h", 16838),
    orientation: attr(pgSz, "w:orient") ?? (n(pgSz, "w:w", 11906) > n(pgSz, "w:h", 16838) ? "landscape" : "portrait"),
    top: n(pgMar, "w:top", 1418),
    bottom: n(pgMar, "w:bottom", 1418),
    left: n(pgMar, "w:left", 1418),
    right: n(pgMar, "w:right", 1418),
  };
  p.textWidth = p.width - p.left - p.right;
  p.textHeight = p.height - Math.abs(p.top) - Math.abs(p.bottom);
  return p;
}

// ---------------------------------------------------------------- paragraphs and placeholders

/** The w:t nodes that belong to a paragraph itself (not to a text box nested in it). */
const ownTexts = (p) => descendants(p, "w:t").filter((t) => closest(t.parentNode, "w:p") === p);
const paragraphText = (p) => ownTexts(p).map((t) => t.textContent).join("");

/** Every {{placeholder}} in a part, by name. */
export function placeholdersIn(doc) {
  const names = new Set();
  for (const p of descendants(doc, "w:p")) for (const [, name] of paragraphText(p).matchAll(PLACEHOLDER)) names.add(name.trim());
  return [...names];
}

const isMarker = (p) => new RegExp(`^\\s*\\{\\{\\s*${MARKER}\\s*\\}\\}\\s*$`, "i").test(paragraphText(p));

/**
 * Fills {{placeholders}} in a part, even when Word split one across several runs: the value goes in the run where
 * the placeholder starts, and the rest of it is taken out of the runs it spills into. Newlines in a value become line breaks.
 */
export function fillPlaceholders(part, values) {
  const doc = part.ownerDocument ?? part;
  const filled = new Set();
  const lookup = new Map(Object.entries(values ?? {}).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const p of descendants(part, "w:p")) {
    const nodes = ownTexts(p);
    if (!nodes.length) continue;
    const full = nodes.map((t) => t.textContent).join("");
    const matches = [...full.matchAll(PLACEHOLDER)].filter((m) => m[1].trim().toLowerCase() !== MARKER && lookup.has(m[1].trim().toLowerCase()));
    if (!matches.length) continue;
    const starts = [];
    let offset = 0;
    for (const t of nodes) {
      starts.push(offset);
      offset += t.textContent.length;
    }
    const at = (pos) => {
      let i = nodes.length - 1;
      while (i > 0 && starts[i] > pos) i--;
      return i;
    };
    for (const m of matches.reverse()) {
      const name = m[1].trim();
      const value = String(lookup.get(name.toLowerCase()) ?? "");
      const begin = m.index;
      const end = m.index + m[0].length;
      const first = at(begin);
      const last = at(end - 1);
      const firstText = nodes[first].textContent;
      const lastText = nodes[last].textContent;
      const before = firstText.slice(0, begin - starts[first]);
      const after = lastText.slice(end - starts[last]);
      for (let i = first + 1; i < last; i++) setText(nodes[i], "");
      if (first !== last) setText(nodes[last], after);
      const lines = value.split(/\r?\n/);
      setText(nodes[first], before + lines[0] + (first === last ? after : ""));
      if (lines.length > 1) {
        // The other lines after the first, each after a line break, in the same run; what followed moves to the last.
        const head = nodes[first];
        let anchor = head;
        const tail = first === last ? after : "";
        setText(head, before + lines[0]);
        lines.slice(1).forEach((line, i) => {
          const br = doc.createElementNS(NS.w, "w:br");
          const t = doc.createElementNS(NS.w, "w:t");
          setText(t, line + (i === lines.length - 2 ? tail : ""));
          anchor.parentNode.insertBefore(br, anchor.nextSibling);
          br.parentNode.insertBefore(t, br.nextSibling);
          anchor = t;
        });
      }
      filled.add(name);
    }
  }
  return filled;
}

function setText(t, value) {
  while (t.firstChild) t.removeChild(t.firstChild);
  t.appendChild(t.ownerDocument.createTextNode(value));
  t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
}

// ---------------------------------------------------------------- read_template

/** What a template holds: its page, header and footer, styles by kind, the style for each role, placeholders and marker. */
export function readTemplate(file) {
  const { files, source } = openTemplate(file);
  const t = load(files);
  const pg = page(t.sectPr);
  const visible = (kind) => t.styles.list.filter((s) => s.type === kind).map((s) => ({ id: s.id, name: s.name, ...(s.isDefault ? { default: true } : {}), ...(s.custom ? { custom: true } : {}), ...(s.hidden ? { hidden: true } : {}) }));
  const roles = mapRoles(t.styles);
  const parts = t.headerFooter.map((hf) => {
    const xml = text(files, hf.part);
    const doc = xml ? parseXml(xml, hf.part) : null;
    return { ...hf, doc };
  });
  const placeholders = { body: placeholdersIn(t.body).filter((n) => n.toLowerCase() !== MARKER) };
  for (const hf of parts) {
    if (!hf.doc) continue;
    const found = placeholdersIn(hf.doc);
    if (found.length) placeholders[hf.kind] = [...new Set([...(placeholders[hf.kind] ?? []), ...found])];
  }
  const marker = descendants(t.body, "w:p").find(isMarker);
  const lines = outline(t.body, files, t, { styles: true }).slice(0, 25);
  const refs = (kind) => children(t.sectPr, `w:${kind}Reference`).map((r) => attr(r, "w:type") ?? "default");
  const describe = (id) => (id ? { id, name: t.styles.byId.get(id)?.name ?? id } : null);
  return {
    template: source,
    kind: files[t.main] && /template\.main/.test(text(files, "[Content_Types].xml") ?? "") ? "dotx" : "docx",
    page: {
      size: `${cm(pg.width)} x ${cm(pg.height)} cm`,
      orientation: pg.orientation,
      margins: `top ${cm(pg.top)}, bottom ${cm(pg.bottom)}, left ${cm(pg.left)}, right ${cm(pg.right)} cm`,
      textWidth: `${cm(pg.textWidth)} cm`,
      sections: descendants(t.body, "w:sectPr").length,
    },
    header: { present: refs("header").length > 0, types: refs("header"), text: hfText(parts, "header"), images: hfImages(parts, "header") },
    footer: { present: refs("footer").length > 0, types: refs("footer"), text: hfText(parts, "footer"), images: hfImages(parts, "footer") },
    roles: Object.fromEntries(ROLES.map((r) => [r, describe(roles[r])])),
    headingLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => t.styles.list.some((s) => headingLevel(t.styles, s.id) === n)),
    styles: { paragraph: visible("paragraph"), character: visible("character"), table: visible("table"), numbering: visible("numbering") },
    listStyles: t.styles.list.filter((s) => s.type === "paragraph" && (inherited(t.styles, s.id, "numId") || /list|lista|liste|vi[nñ]eta/i.test(s.name))).map((s) => ({ id: s.id, name: s.name, numbered: !!inherited(t.styles, s.id, "numId") })),
    placeholders,
    contentMarker: marker ? (closest(marker, "w:tc") ? "in a table cell" : "in the body") : null,
    body: { paragraphs: descendants(t.body, "w:p").length, tables: descendants(t.body, "w:tbl").length, images: descendants(t.body, "w:drawing").length, firstLines: lines },
  };
}

const hfText = (parts, kind) => parts.filter((p) => p.kind === kind && p.doc).map((p) => descendants(p.doc, "w:p").map(paragraphText).filter(Boolean).join(" / ")).filter(Boolean);
const hfImages = (parts, kind) => parts.filter((p) => p.kind === kind && p.doc).reduce((n, p) => n + descendants(p.doc, "w:drawing").length + descendants(p.doc, "w:pict").length, 0);

// ---------------------------------------------------------------- write_docx

const IMAGE_TYPES = { png: "image/png", jpeg: "image/jpeg", gif: "image/gif" };

/** An image's type and size in pixels, from its first bytes. */
export function imageInfo(data) {
  const b = Buffer.from(data);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { type: "png", width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString("ascii", 0, 4) === "GIF8") return { type: "gif", width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let off = 2;
    while (off + 9 < b.length) {
      if (b[off] !== 0xff) {
        off++;
        continue;
      }
      const marker = b[off + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { type: "jpeg", height: b.readUInt16BE(off + 5), width: b.readUInt16BE(off + 7) };
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        off += 2;
        continue;
      }
      off += 2 + b.readUInt16BE(off + 2);
    }
    throw new Error("a JPEG whose size couldn't be read");
  }
  const head = b.toString("utf8", 0, 200);
  if (/<svg|<\?xml/i.test(head)) throw new Error("an SVG: Word needs a PNG or JPEG copy of it. Convert it first");
  if (b.toString("ascii", 8, 12) === "WEBP") throw new Error("a WebP: Word needs a PNG or JPEG. Convert it first");
  throw new Error("not a PNG, JPEG or GIF image");
}

/** Numbering for the lists: the template's own bullets and numbers where its list styles have them, else built-in ones. */
class Numbering {
  constructor(files, part, styles, plan) {
    this.part = part;
    this.xml = text(files, part);
    const ids = (re) => [...(this.xml ?? "").matchAll(re)].map((m) => Number(m[1]));
    this.nextAbstract = Math.max(0, ...ids(/<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"/g)) + 1;
    this.nextNum = Math.max(0, ...ids(/<w:num\b[^>]*w:numId="(\d+)"/g)) + 1;
    this.numToAbstract = new Map([...(this.xml ?? "").matchAll(/<w:num\b[^>]*w:numId="(\d+)"[^>]*>\s*<w:abstractNumId w:val="(\d+)"/g)].map((m) => [m[1], m[2]]));
    this.styles = styles;
    this.plan = plan;
    this.abstracts = "";
    this.nums = "";
    this.shared = new Map();
    this.own = {};
  }

  abstractFor(ordered) {
    const role = ordered ? "listNumber" : "listBullet";
    const styleId = this.plan.chosen[role] ?? this.plan.found[role];
    const numId = styleId ? inherited(this.styles, styleId, "numId") : null;
    if (numId && this.numToAbstract.has(String(numId))) return this.numToAbstract.get(String(numId));
    if (!this.own[ordered]) {
      const id = this.nextAbstract++;
      const bullets = ["•", "◦", "▪"];
      const formats = ["decimal", "lowerLetter", "lowerRoman"];
      const levels = Array.from({ length: 9 }, (_, i) => {
        const fmt = ordered ? `<w:numFmt w:val="${formats[i % 3]}"/><w:lvlText w:val="%${i + 1}."/>` : `<w:numFmt w:val="bullet"/><w:lvlText w:val="${bullets[i % 3]}"/>`;
        return `<w:lvl w:ilvl="${i}"><w:start w:val="1"/>${fmt}<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>`;
      }).join("");
      this.abstracts += `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/>${levels}</w:abstractNum>`;
      this.own[ordered] = String(id);
    }
    return this.own[ordered];
  }

  /** A numbering instance: one shared by every bulleted list, a new one (restarting) for each numbered list. */
  num(ordered, level, start) {
    const abstract = this.abstractFor(ordered);
    if (!ordered && this.shared.has(abstract)) return this.shared.get(abstract);
    const id = this.nextNum++;
    const override = ordered ? `<w:lvlOverride w:ilvl="${Math.min(level, 8)}"><w:startOverride w:val="${start}"/></w:lvlOverride>` : "";
    this.nums += `<w:num w:numId="${id}"><w:abstractNumId w:val="${abstract}"/>${override}</w:num>`;
    if (!ordered) this.shared.set(abstract, id);
    return id;
  }

  get changed() {
    return !!(this.abstracts || this.nums);
  }

  /** numbering.xml with the new definitions: abstract ones before the first w:num, as the schema orders them. */
  result() {
    if (!this.xml) return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering xmlns:w="${NS.w}">${this.abstracts}${this.nums}</w:numbering>`;
    let xml = this.xml;
    const firstNum = xml.search(/<w:num[\s>]/);
    const tail = xml.search(/<w:numIdMacAtCleanup\b/);
    const end = tail >= 0 ? tail : xml.lastIndexOf("</w:numbering>");
    xml = xml.slice(0, end) + this.nums + xml.slice(end);
    const at = firstNum >= 0 ? firstNum : xml.indexOf(this.nums || "</w:numbering>");
    return xml.slice(0, at) + this.abstracts + xml.slice(at);
  }
}

/** Adds a relationship to a part's .rels, creating the file if needed. */
function addRels(files, part, list) {
  if (!list.length) return;
  const file = relsPath(part);
  let xml = text(files, file) ?? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS.rel}"></Relationships>`;
  const add = list.map((r) => `<Relationship Id="${esc(r.id)}" Type="${r.type}" Target="${esc(r.target)}"${r.mode ? ` TargetMode="${r.mode}"` : ""}/>`).join("");
  const end = xml.lastIndexOf("</Relationships>");
  xml = end >= 0 ? xml.slice(0, end) + add + xml.slice(end) : xml.replace(/<Relationships([^>]*)\/>/, `<Relationships$1>${add}</Relationships>`);
  files[file] = bytes(xml);
}

/** Adds Default (by extension) and Override (by part) entries to [Content_Types].xml. */
function contentTypes(files, { defaults = {}, overrides = {}, retype = {} }) {
  let xml = text(files, "[Content_Types].xml");
  if (!xml) throw new Error("The template has no [Content_Types].xml: it isn't a valid .docx.");
  for (const [ext, type] of Object.entries(defaults)) {
    if (!new RegExp(`<Default[^>]*Extension="${ext}"`, "i").test(xml)) xml = xml.replace("</Types>", `<Default Extension="${ext}" ContentType="${type}"/></Types>`);
  }
  for (const [part, type] of Object.entries(overrides)) {
    if (!xml.includes(`PartName="/${part}"`)) xml = xml.replace("</Types>", `<Override PartName="/${part}" ContentType="${type}"/></Types>`);
  }
  for (const [from, to] of Object.entries(retype)) xml = xml.split(`ContentType="${from}"`).join(`ContentType="${to}"`);
  files["[Content_Types].xml"] = bytes(xml);
}

/** Sets the document's title in docProps/core.xml, when there is one. */
function setTitle(files, title) {
  const rel = readRels(files, "").find((r) => r.type === REL.core);
  const part = rel ? resolveTarget("", rel.target) : null;
  if (!part || !files[part]) return false;
  let xml = text(files, part);
  const value = `<dc:title>${esc(title)}</dc:title>`;
  if (/<dc:title\s*\/>|<dc:title>[\s\S]*?<\/dc:title>/.test(xml)) xml = xml.replace(/<dc:title\s*\/>|<dc:title>[\s\S]*?<\/dc:title>/, value);
  else if (/xmlns:dc=/.test(xml)) xml = xml.replace(/<\/cp:coreProperties>/, `${value}</cp:coreProperties>`);
  else return false;
  files[part] = bytes(xml);
  return true;
}

/**
 * Writes a .docx from a template (or the built-in clean one) and Markdown.
 * Returns what was written and how: the styles used, what was added, placeholders filled or left, and warnings.
 */
export function writeDocx({ template, markdown, markdownFile, values = {}, output, overwrite = false, title, styles: overrides, templateBody = "replace", imagesDir }) {
  if (!output) throw new Error("Say where to save the document (output, an absolute path ending in .docx).");
  const out = mustBeAbsolute(output, "output");
  if (path.extname(out).toLowerCase() !== ".docx") throw new Error(`The output must end in .docx: ${out}`);
  if (existsSync(out) && !overwrite) throw new Error(`${out} already exists. Choose another name, or pass overwrite: true once the person agrees to replace it.`);
  if (template && path.normalize(template).toLowerCase() === out.toLowerCase()) throw new Error("The output can't be the template itself: save the document under another name.");
  if ((markdown == null) === (markdownFile == null)) throw new Error("Give the content as markdown (the text) or as markdownFile (an absolute path to a .md file), one of the two.");
  let source = markdown;
  let base = imagesDir ? mustBeAbsolute(imagesDir, "imagesDir") : null;
  if (markdownFile != null) {
    const md = mustBeAbsolute(markdownFile, "markdownFile");
    if (!existsSync(md)) throw new Error(`No Markdown file at ${md}.`);
    source = readFileSync(md, "utf8");
    base ??= path.dirname(md);
  }

  const { files, source: templateSource } = openTemplate(template);
  const t = load(files);
  const pg = page(t.sectPr);
  const plan = new StylePlan(t.styles, overrides);
  const warnings = plan.warnings;
  const counts = {};
  const relsList = [];
  const usedRelIds = new Set(t.rels.map((r) => r.id));
  let relN = 1;
  const newRelId = () => {
    while (usedRelIds.has(`rIdDoc${relN}`)) relN++;
    usedRelIds.add(`rIdDoc${relN}`);
    return `rIdDoc${relN}`;
  };

  // Numbering part: the template's, or a new one.
  const numberingRel = t.rels.find((r) => r.type === REL.numbering);
  const numberingPart = numberingRel ? resolveTarget(t.main, numberingRel.target) : "word/numbering.xml";
  const numbering = new Numbering(files, numberingPart, t.styles, plan);

  // Drawing ids unique across the package.
  let docPrId = Math.max(0, ...Object.entries(files).filter(([n]) => /^word\/.*\.xml$/.test(n)).flatMap(([, d]) => [...Buffer.from(d).toString("utf8").matchAll(/<wp:docPr[^>]*\sid="(\d+)"/g)].map((m) => Number(m[1])))) + 1;
  const media = new Map();
  const links = new Map();
  const mediaExts = {};
  const mediaDir = path.posix.dirname(t.main) + "/media/";

  const ctx = {
    plan,
    textWidth: pg.textWidth,
    warn: (w) => warnings.push(w),
    count: (key, n = 1) => (counts[key] = (counts[key] ?? 0) + n),
    listNum: (ordered, level, start) => numbering.num(ordered, level, start),
    link: (href) => {
      if (!links.has(href)) {
        const id = newRelId();
        relsList.push({ id, type: REL.hyperlink, target: href, mode: "External" });
        links.set(href, id);
      }
      return links.get(href);
    },
    image: (href, attrs) => {
      let file = String(href).trim();
      if (/^https?:\/\//i.test(file)) throw new Error(`The image ${file} is on the web: this server doesn't download anything. Save it on this computer and use its path.`);
      if (/^data:/i.test(file)) throw new Error("Images as data: URLs aren't supported: save the image as a file and use its path.");
      file = file.replace(/^file:\/\/\/?/i, (m) => (process.platform === "win32" ? "" : "/"));
      try {
        file = decodeURI(file);
      } catch {}
      if (!path.isAbsolute(file)) {
        if (!base) throw new Error(`The image ${href} has a relative path: give imagesDir (the folder it's relative to), or use an absolute path.`);
        file = path.resolve(base, file);
      }
      if (!existsSync(file)) throw new Error(`No image at ${file}.`);
      let entry = media.get(file);
      if (!entry) {
        const data = readFileSync(file);
        let info;
        try {
          info = imageInfo(data);
        } catch (e) {
          throw new Error(`The image ${file} is ${e.message}.`);
        }
        let n = media.size + 1;
        while (files[`${mediaDir}documents-image${n}.${info.type === "jpeg" ? "jpeg" : info.type}`]) n++;
        const name = `documents-image${n}.${info.type}`;
        files[mediaDir + name] = new Uint8Array(data);
        mediaExts[info.type] = IMAGE_TYPES[info.type];
        const id = newRelId();
        relsList.push({ id, type: REL.image, target: `media/${name}` });
        entry = { rId: id, name, info, file };
        media.set(file, entry);
      }
      const maxW = pg.textWidth * 635;
      const maxH = pg.textHeight * 635;
      const { width: pw, height: ph } = entry.info;
      let cx = attrs.width ? sizeEmu(attrs.width, maxW) : null;
      let cy = attrs.height ? sizeEmu(attrs.height, maxW) : null;
      if ((attrs.width && !cx) || (attrs.height && !cy)) warnings.push(`The size of ${path.basename(file)} (${attrs.width ?? attrs.height}) wasn't understood: use cm, mm, in, pt, px or %. Its own size was used.`);
      if (cx && !cy) cy = Math.round((cx * ph) / pw);
      else if (cy && !cx) cx = Math.round((cy * pw) / ph);
      else if (!cx && !cy) {
        cx = pw * 9525;
        cy = ph * 9525;
      }
      if (cx > maxW || cy > maxH) {
        const k = Math.min(maxW / cx, maxH / cy);
        cx = Math.round(cx * k);
        cy = Math.round(cy * k);
        warnings.push(`${path.basename(file)} was scaled down to fit the page (${cm(cx / 635)} x ${cm(cy / 635)} cm).`);
      }
      return { rId: entry.rId, name: entry.name, cx, cy, id: docPrId++ };
    },
  };

  const bodyXml = markdownToBody(source ?? "", ctx);

  // The new body, parsed with every namespace it uses, and put where it goes.
  const nsDecl = `xmlns:w="${NS.w}" xmlns:r="${NS.r}" xmlns:wp="${NS.wp}" xmlns:a="${NS.a}" xmlns:pic="${NS.pic}"`;
  const fragment = parseXml(`<w:document ${nsDecl}><w:body>${bodyXml}</w:body></w:document>`, "the generated body");
  const root = t.doc.documentElement;
  for (const [prefix, uri] of [["r", NS.r], ["wp", NS.wp]]) if (!root.getAttribute(`xmlns:${prefix}`)) root.setAttribute(`xmlns:${prefix}`, uri);
  const nodes = children(child(fragment.documentElement, "w:body")).map((n) => t.doc.importNode(n, true));
  const marker = descendants(t.body, "w:p").find(isMarker);
  let mode;
  if (marker) {
    mode = "at the {{content}} marker";
    const parent = marker.parentNode;
    for (const n of nodes) parent.insertBefore(n, marker);
    parent.removeChild(marker);
    if (parent.nodeName === "w:tc" && children(parent).at(-1)?.nodeName !== "w:p") parent.appendChild(t.doc.createElementNS(NS.w, "w:p"));
  } else {
    if (templateBody === "append") mode = "after the template's own body";
    else {
      mode = "replacing the template's body";
      for (const n of children(t.body)) if (n !== t.sectPr) t.body.removeChild(n);
    }
    for (const n of nodes) (t.sectPr ? t.body.insertBefore(n, t.sectPr) : t.body.appendChild(n));
  }
  const beforeSect = t.sectPr ? t.sectPr.previousSibling : t.body.lastChild;
  if (!children(t.body).some((n) => n.nodeName === "w:p" || n.nodeName === "w:tbl") || beforeSect?.nodeName === "w:tbl") {
    const p = t.doc.createElementNS(NS.w, "w:p");
    t.sectPr ? t.body.insertBefore(p, t.sectPr) : t.body.appendChild(p);
  }

  // Placeholders, in the body and in every header and footer.
  const wanted = new Set();
  const filled = new Set();
  for (const n of placeholdersIn(t.body)) wanted.add(n);
  for (const n of fillPlaceholders(t.body, values)) filled.add(n);
  for (const hf of t.headerFooter) {
    const xml = text(files, hf.part);
    if (!xml) continue;
    const doc = parseXml(xml, hf.part);
    for (const n of placeholdersIn(doc)) wanted.add(n);
    const done = fillPlaceholders(doc, values);
    if (done.size) files[hf.part] = bytes(serializeXml(doc));
    for (const n of done) filled.add(n);
  }
  wanted.delete(MARKER);
  const left = [...wanted].filter((n) => !filled.has(n));
  const unused = Object.keys(values ?? {}).filter((k) => ![...wanted].some((w) => w.toLowerCase() === k.trim().toLowerCase()));
  if (left.length) warnings.push(`Placeholders left without a value: ${left.map((n) => `{{${n}}}`).join(", ")}.`);
  if (unused.length) warnings.push(`Values with no placeholder in the template: ${unused.join(", ")}.`);

  files[t.main] = bytes(serializeXml(t.doc));
  files[t.stylesPart] = bytes(plan.apply(text(files, t.stylesPart)));
  const overrides2 = {};
  if (!t.rels.some((r) => r.type === REL.styles)) {
    relsList.push({ id: newRelId(), type: REL.styles, target: path.posix.relative(path.posix.dirname(t.main), t.stylesPart) });
    overrides2[t.stylesPart] = CONTENT_TYPE.styles;
  }
  if (numbering.changed) {
    files[numberingPart] = bytes(numbering.result());
    if (!numberingRel) {
      relsList.push({ id: newRelId(), type: REL.numbering, target: path.posix.relative(path.posix.dirname(t.main), numberingPart) });
      overrides2[numberingPart] = CONTENT_TYPE.numbering;
    }
  }
  if (ctx.usesToc) {
    const settingsRel = t.rels.find((r) => r.type === REL.settings);
    const settingsPart = settingsRel ? resolveTarget(t.main, settingsRel.target) : null;
    if (settingsPart && files[settingsPart]) {
      let xml = text(files, settingsPart);
      if (!/<w:updateFields\b/.test(xml)) xml = xml.replace(/(<w:settings\b[^>]*>)/, `$1<w:updateFields w:val="true"/>`);
      files[settingsPart] = bytes(xml);
    }
  }
  addRels(files, t.main, relsList);
  contentTypes(files, { defaults: mediaExts, overrides: overrides2, retype: { [CONTENT_TYPE.template]: CONTENT_TYPE.document } });
  if (title) setTitle(files, title);

  const zipped = saveZip(files);
  mkdirSync(path.dirname(out), { recursive: true });
  const tmp = `${out}.${process.pid}.tmp`;
  writeFileSync(tmp, zipped);
  try {
    renameSync(tmp, out);
  } catch (e) {
    rmSync(tmp, { force: true });
    if (["EBUSY", "EPERM", "EACCES"].includes(e.code)) throw new Error(`${out} couldn't be written (${e.code}): it may be open in Word or LibreOffice. Close it and try again.`);
    throw e;
  }

  const used = Object.fromEntries([...plan.used].map(([role, id]) => [role, plan.name(id)]));
  return {
    output: out,
    bytes: statSync(out).size,
    template: templateSource,
    content: mode,
    page: `${cm(pg.width)} x ${cm(pg.height)} cm, text width ${cm(pg.textWidth)} cm`,
    stylesUsed: used,
    stylesAdded: [...plan.added.values()].map((a) => plan.name(a.id)),
    counts,
    placeholders: { filled: [...filled], left, unused },
    warnings,
  };
}

// ---------------------------------------------------------------- read_docx

/** The body as Markdown-ish lines, each with its paragraph style when asked. */
function outline(body, files, t, { styles: withStyles }) {
  const lines = [];
  const defaultPara = t.styles.list.find((s) => s.type === "paragraph" && s.isDefault)?.id ?? null;
  const rels = new Map(t.rels.map((r) => [r.id, r]));
  const numXml = text(files, (() => {
    const r = t.rels.find((x) => x.type === REL.numbering);
    return r ? resolveTarget(t.main, r.target) : "word/numbering.xml";
  })()) ?? "";
  const numDoc = numXml ? parseXml(numXml, "numbering.xml") : null;
  const formats = new Map();
  if (numDoc) {
    const abstracts = new Map(children(numDoc.documentElement, "w:abstractNum").map((a) => [attr(a, "w:abstractNumId"), a]));
    for (const n of children(numDoc.documentElement, "w:num")) {
      const a = abstracts.get(val(n, "w:abstractNumId"));
      formats.set(attr(n, "w:numId"), (lvl) => val(children(a, "w:lvl").find((l) => attr(l, "w:ilvl") === String(lvl)), "w:numFmt") ?? "decimal");
    }
  }
  const styleName = (id) => t.styles.byId.get(id)?.name ?? `${id} (missing)`;
  const tag = (id) => (withStyles ? `[${styleName(id)}] ` : "");

  const inline = (node) => {
    let s = "";
    for (const n of children(node)) {
      switch (n.nodeName) {
        case "w:r":
          for (const c of children(n)) {
            if (c.nodeName === "w:t") s += c.textContent;
            else if (c.nodeName === "w:tab") s += "\t";
            else if (c.nodeName === "w:br") s += attr(c, "w:type") === "page" ? "<!-- pagebreak -->" : "\n";
            else if (c.nodeName === "w:drawing" || c.nodeName === "w:pict") {
              const docPr = descendants(c, "wp:docPr")[0];
              const blip = descendants(c, "a:blip")[0];
              const target = rels.get(attr(blip, "r:embed"))?.target ?? "";
              s += `![${attr(docPr, "descr") ?? ""}](${target})`;
            }
          }
          break;
        case "w:hyperlink": {
          const inner = inline(n);
          const target = rels.get(attr(n, "r:id"))?.target;
          s += target ? `[${inner}](${target})` : inner;
          break;
        }
        case "w:del":
        case "w:pPr":
          break;
        default:
          s += inline(n);
      }
    }
    return s;
  };

  const paragraph = (p, prefix = "") => {
    const pPr = child(p, "w:pPr");
    const id = val(pPr, "w:pStyle") ?? defaultPara;
    let s = inline(p);
    const level = id ? headingLevel(t.styles, id) : null;
    const numPr = child(pPr, "w:numPr");
    const numId = numPr ? val(numPr, "w:numId") : id ? inherited(t.styles, id, "numId") : null;
    const ilvl = Number((numPr ? val(numPr, "w:ilvl") : null) ?? (id ? inherited(t.styles, id, "ilvl") : 0) ?? 0);
    if (level) s = `${"#".repeat(level)} ${s}`;
    else if (numId && numId !== "0") s = `${"  ".repeat(ilvl)}${formats.get(String(numId))?.(ilvl) === "bullet" ? "-" : "1."} ${s}`;
    return `${prefix}${id ? tag(id) : ""}${s}`;
  };

  const walk = (node) => {
    for (const n of children(node)) {
      if (n.nodeName === "w:p") {
        const line = paragraph(n);
        if (line.replace(/^\[[^\]]*\] /, "").trim()) lines.push(line);
      } else if (n.nodeName === "w:tbl") {
        const tblStyle = val(child(n, "w:tblPr"), "w:tblStyle");
        lines.push(withStyles ? `[table: ${tblStyle ? styleName(tblStyle) : "no style"}]` : "");
        children(n, "w:tr").forEach((tr, i) => {
          const cells = children(tr, "w:tc").map((tc) => children(tc, "w:p").map((p) => inline(p)).filter(Boolean).join("<br>").replace(/\|/g, "\\|"));
          lines.push(`| ${cells.join(" | ")} |`);
          if (i === 0) lines.push(`|${cells.map(() => " --- ").join("|")}|`);
        });
      } else if (n.nodeName === "w:sdt") walk(child(n, "w:sdtContent"));
      else if (["w:customXml", "w:ins", "w:smartTag"].includes(n.nodeName)) walk(n);
    }
  };
  walk(body);
  return lines;
}

/** Reads a .docx back: its text as Markdown with the style of each paragraph, and what to check. */
export function readDocx(file, { styles = true, maxChars = 40000 } = {}) {
  const absolute = mustBeAbsolute(file, "document");
  if (!existsSync(absolute)) throw new Error(`No document at ${absolute}.`);
  const files = openZip(readFileSync(absolute), absolute);
  const t = load(files);
  let body = outline(t.body, files, t, { styles }).join("\n");
  const truncated = body.length > maxChars;
  if (truncated) body = `${body.slice(0, maxChars)}\n…`;
  // Styles referenced but not defined: Word falls back to Normal for them.
  const referenced = new Set();
  const parts = [t.main, ...t.headerFooter.map((h) => h.part)];
  for (const part of parts) {
    const xml = text(files, part);
    if (!xml) continue;
    for (const [, id] of xml.matchAll(/<w:(?:pStyle|rStyle|tblStyle) w:val="([^"]*)"/g)) referenced.add(id);
  }
  const missing = [...referenced].filter((id) => !t.styles.byId.has(id));
  const headers = t.headerFooter.map((hf) => {
    const xml = text(files, hf.part);
    const doc = xml ? parseXml(xml, hf.part) : null;
    return { kind: hf.kind, text: doc ? descendants(doc, "w:p").map(paragraphText).filter(Boolean).join(" / ") : "" };
  });
  const placeholders = [...new Set([...placeholdersIn(t.body), ...t.headerFooter.flatMap((hf) => (files[hf.part] ? placeholdersIn(parseXml(text(files, hf.part), hf.part)) : []))])];
  return {
    document: absolute,
    bytes: statSync(absolute).size,
    page: (() => {
      const pg = page(t.sectPr);
      return `${cm(pg.width)} x ${cm(pg.height)} cm, ${pg.orientation}`;
    })(),
    counts: {
      paragraphs: descendants(t.body, "w:p").length,
      headings: descendants(t.body, "w:p").filter((p) => {
        const id = val(child(p, "w:pPr"), "w:pStyle");
        return id && headingLevel(t.styles, id);
      }).length,
      tables: descendants(t.body, "w:tbl").length,
      images: descendants(t.body, "w:drawing").length,
      pageBreaks: descendants(t.body, "w:br").filter((b) => attr(b, "w:type") === "page").length,
    },
    headersAndFooters: headers,
    placeholdersLeft: placeholders,
    missingStyles: missing,
    truncated,
    text: body,
  };
}
