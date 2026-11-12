// XML and zip helpers for the .docx parts: parse and serialize with xmldom, read and write the zip with fflate.
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export const NS = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  pic: "http://schemas.openxmlformats.org/drawingml/2006/picture",
  rel: "http://schemas.openxmlformats.org/package/2006/relationships",
  ct: "http://schemas.openxmlformats.org/package/2006/content-types",
};

export const REL = {
  document: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  numbering: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  header: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header",
  footer: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer",
  settings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings",
  core: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
};

export const CONTENT_TYPE = {
  document: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  template: "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml",
  styles: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  numbering: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
  settings: "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  core: "application/vnd.openxmlformats-package.core-properties+xml",
};

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** Escapes text for XML content and attribute values. */
export const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Parses XML, throwing on anything not well-formed. */
export function parseXml(text, where = "XML") {
  const parser = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") throw new Error(`${where} is not well-formed XML: ${message}`);
    },
  });
  return parser.parseFromString(text, "application/xml");
}

/** Serializes a parsed document back to text, with its declaration. */
export function serializeXml(doc) {
  const text = new XMLSerializer().serializeToString(doc);
  return text.startsWith("<?xml") ? text : XML_DECLARATION + text;
}

/** Child elements of a node, optionally only those with a qualified name. */
export function children(node, name) {
  const out = [];
  for (let child = node?.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1 && (!name || child.nodeName === name)) out.push(child);
  }
  return out;
}

export const child = (node, name) => children(node, name)[0] ?? null;

/** Every descendant element with a qualified name, in document order. */
export function descendants(node, name) {
  return node ? Array.from(node.getElementsByTagName(name)) : [];
}

/** An attribute by its qualified name (w:val), or null. */
export function attr(node, name) {
  if (!node) return null;
  const value = node.getAttribute(name);
  return value === "" && !node.hasAttribute(name) ? null : value;
}

/** The value of a child's w:val, e.g. val(pPr, "w:pStyle"). */
export const val = (node, name) => attr(child(node, name), "w:val");

/** The closest ancestor (or the node itself) with a qualified name. */
export function closest(node, name) {
  for (let n = node; n; n = n.parentNode) if (n.nodeType === 1 && n.nodeName === name) return n;
  return null;
}

/** Opens a .docx (a zip) as a map of path to bytes. */
export function openZip(bytes, where = "the file") {
  try {
    return unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  } catch (error) {
    throw new Error(`${where} is not a .docx (not a zip file): ${error.message}`);
  }
}

/** Writes the map back to a zip; [Content_Types].xml first, as Office expects. */
export function saveZip(files) {
  const ordered = {};
  if (files["[Content_Types].xml"]) ordered["[Content_Types].xml"] = files["[Content_Types].xml"];
  for (const [name, data] of Object.entries(files)) if (name !== "[Content_Types].xml") ordered[name] = data;
  return zipSync(ordered, { level: 6 });
}

export const text = (files, name) => (files[name] ? strFromU8(files[name]) : null);
export const bytes = (value) => strToU8(value);

/** A part's relationships file: word/document.xml → word/_rels/document.xml.rels. */
export function relsPath(part) {
  const slash = part.lastIndexOf("/");
  return `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`;
}

/** Reads a relationships part as a list of { id, type, target, mode }. */
export function readRels(files, part) {
  const xml = text(files, relsPath(part));
  if (!xml) return [];
  const doc = parseXml(xml, relsPath(part));
  return children(doc.documentElement, "Relationship").map((r) => ({
    id: r.getAttribute("Id"),
    type: r.getAttribute("Type"),
    target: r.getAttribute("Target"),
    mode: r.getAttribute("TargetMode") || null,
  }));
}

/** Resolves a relationship target relative to its part (word/document.xml + media/a.png → word/media/a.png). */
export function resolveTarget(part, target) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = part.split("/").slice(0, -1);
  for (const piece of target.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

/** The main document part, from the package's relationships. */
export function mainPart(files) {
  const rel = readRels(files, "").find((r) => r.type === REL.document || r.type.endsWith("/officeDocument"));
  if (rel) return resolveTarget("", rel.target);
  if (files["word/document.xml"]) return "word/document.xml";
  throw new Error("This file has no Word document in it (no main document part).");
}
