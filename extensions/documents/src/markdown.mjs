// Markdown to WordprocessingML: the body of the document, in the template's styles.
// Headings, paragraphs, lists, tables, code, quotes, images, links, page breaks and a table of contents.
import { Lexer } from "marked";
import { esc } from "./xml.mjs";

const PAGE_BREAK = /^\s*(\\pagebreak|\\newpage|<!--\s*page\s*-?break\s*-->)\s*$/i;
const TOC = /^\s*(\[toc\]|<!--\s*toc\s*-->)\s*$/i;
const ATTRS = /^\{\s*([^}]*)\}/;

/** Plain text of inline tokens (for the table of contents, alt texts and column widths). */
export function plain(tokens = []) {
  return tokens.map((t) => (t.tokens ? plain(t.tokens) : t.type === "br" ? " " : t.type === "html" ? "" : (t.text ?? ""))).join("");
}

/** A size like 8cm, 50%, 300px, 2in, 60mm or 120pt, in EMU (914400 per inch), against the text width. */
export function sizeEmu(spec, textWidth) {
  const m = String(spec).trim().match(/^(\d+(?:[.,]\d+)?)\s*(cm|mm|in|pt|px|%)?$/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  const unit = (m[2] ?? "px").toLowerCase();
  const perUnit = { cm: 360000, mm: 36000, in: 914400, pt: 12700, px: 9525 }[unit];
  return Math.round(unit === "%" ? (textWidth * n) / 100 : n * perUnit);
}

/** The image's attributes: `{width=8cm}` right after it, or `"width=8cm"` as its title. */
function imageAttrs(token, next) {
  const out = {};
  let consumed = 0;
  const read = (s) => {
    for (const [, key, value] of s.matchAll(/(width|height)\s*=\s*"?([^\s"}]+)"?/gi)) out[key.toLowerCase()] = value;
  };
  if (token.title && /(width|height)\s*=/.test(token.title)) read(token.title);
  if (next?.type === "text") {
    const m = next.text.match(ATTRS);
    if (m) {
      read(m[1]);
      consumed = m[0].length;
    }
  }
  return { ...out, consumed };
}

/**
 * Builds the body. `ctx` gives what touches the rest of the package: ctx.plan (StylePlan), ctx.listNum(ordered, level, start),
 * ctx.image(href, attrs) → { rId, cx, cy, name, id }, ctx.link(href) → rId, ctx.textWidth (twips), ctx.count, ctx.warn().
 */
export function markdownToBody(markdown, ctx) {
  const tokens = Lexer.lex(String(markdown).replace(/\r\n?/g, "\n"), { gfm: true });
  const headings = [];
  const walk = (list) => {
    for (const t of list) {
      if (t.type === "heading") headings.push({ depth: t.depth, text: plain(t.tokens) });
      else if (t.type === "blockquote") walk(t.tokens);
    }
  };
  walk(tokens);
  ctx.headings = headings;
  return blocks(tokens, ctx, {});
}

function pPr(parts) {
  const order = ["pStyle", "keepNext", "pageBreakBefore", "numPr", "pBdr", "shd", "spacing", "ind", "jc"];
  const xml = order.filter((k) => parts[k]).map((k) => parts[k]).join("");
  return xml ? `<w:pPr>${xml}</w:pPr>` : "";
}

const para = (props, runs) => `<w:p>${pPr(props)}${runs}</w:p>`;
const style = (id) => `<w:pStyle w:val="${esc(id)}"/>`;
const JC = { left: "left", center: "center", right: "right" };

function blocks(tokens, ctx, opts) {
  let out = "";
  for (const t of tokens) out += block(t, ctx, opts);
  return out;
}

function block(t, ctx, opts) {
  const { plan } = ctx;
  const baseStyle = () => (opts.quote ? plan.id("quote") : plan.id("paragraph"));
  switch (t.type) {
    case "space":
    case "def":
      return "";
    case "heading": {
      const depth = Math.min(t.depth, 6);
      if (t.depth > 6) ctx.warn(`A level-${t.depth} heading was written as level 6, the deepest Word heading this server uses.`);
      ctx.count("headings");
      return para({ pStyle: style(plan.id(`heading${depth}`)) }, inlines(t.tokens, ctx, {}));
    }
    case "paragraph":
    case "text": {
      const raw = t.raw ?? t.text ?? "";
      if (PAGE_BREAK.test(raw)) return pageBreak(ctx);
      if (TOC.test(raw)) return toc(ctx);
      const only = (t.tokens ?? []).filter((x) => !(x.type === "text" && /^\s*(\{[^}]*\})?\s*$/.test(x.text)));
      const centered = only.length === 1 && only[0].type === "image";
      ctx.count("paragraphs");
      return para({ pStyle: style(opts.listStyle ?? baseStyle()), ind: opts.ind, jc: centered ? '<w:jc w:val="center"/>' : "" }, t.tokens ? inlines(t.tokens, ctx, {}) : runs(t.text, {}));
    }
    case "html": {
      if (PAGE_BREAK.test(t.text)) return pageBreak(ctx);
      if (TOC.test(t.text)) return toc(ctx);
      const textOnly = t.text.replace(/<!--[\s\S]*?-->/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
      return textOnly ? para({ pStyle: style(baseStyle()) }, runs(textOnly, {})) : "";
    }
    case "blockquote":
      return blocks(t.tokens, ctx, { ...opts, quote: true });
    case "code": {
      ctx.count("codeBlocks");
      const id = plan.id("code");
      return t.text.split("\n").map((line) => para({ pStyle: style(id) }, runs(line, {}))).join("");
    }
    case "hr":
      return para({ pStyle: style(baseStyle()), pBdr: '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr>' }, "");
    case "list":
      return list(t, ctx, opts, opts.level == null ? 0 : opts.level + 1);
    case "table":
      return table(t, ctx);
    default:
      if (t.tokens) return blocks(t.tokens, ctx, opts);
      return t.text ? para({ pStyle: style(baseStyle()) }, runs(t.text, {})) : "";
  }
}

function pageBreak(ctx) {
  ctx.count("pageBreaks");
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

/** A table of contents field, already showing the headings so it reads well before Word updates it. */
function toc(ctx) {
  ctx.usesToc = true;
  const entries = ctx.headings.filter((h) => h.depth <= 3);
  const lines = entries.map((h, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc("    ".repeat(h.depth - 1) + h.text)}</w:t>`).join("");
  return `<w:p>${pPr({ pStyle: style(ctx.plan.id("paragraph")) })}<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r>${lines || "<w:t> </w:t>"}</w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
}

function list(t, ctx, opts, level) {
  const ordered = !!t.ordered;
  const start = ordered ? Number(t.start || 1) : 1;
  const numId = ctx.listNum(ordered, level, start);
  const styleId = ctx.plan.id(ordered ? "listNumber" : "listBullet");
  const indent = 720 * (level + 1);
  let out = "";
  ctx.count("lists", level === 0 ? 1 : 0);
  for (const item of t.items) {
    let first = true;
    for (const child of item.tokens ?? []) {
      if (child.type === "checkbox") continue;
      if (child.type === "list") {
        out += list(child, ctx, opts, level + 1);
        continue;
      }
      if (child.type === "space") continue;
      if (first && (child.type === "text" || child.type === "paragraph")) {
        first = false;
        ctx.count("listItems");
        const box = item.task ? runs(item.checked ? "☒ " : "☐ ", {}) : "";
        out += para({ pStyle: style(styleId), numPr: `<w:numPr><w:ilvl w:val="${Math.min(level, 8)}"/><w:numId w:val="${numId}"/></w:numPr>` }, box + (child.tokens ? inlines(child.tokens, ctx, {}) : runs(child.text, {})));
        continue;
      }
      first = false;
      // A second paragraph, a code block or a table inside an item: indented under it, without a number.
      out += block(child, ctx, { ...opts, level, listStyle: styleId, ind: `<w:ind w:left="${indent}"/>` });
    }
  }
  return out;
}

function table(t, ctx) {
  ctx.count("tables");
  const cols = t.header.length;
  const width = ctx.textWidth;
  const lengths = t.header.map((h, c) => Math.max(plain(h.tokens).length, ...t.rows.map((r) => plain(r[c]?.tokens).length), 3));
  const total = lengths.reduce((a, b) => a + b, 0);
  let widths = lengths.map((l) => Math.max(width / (cols * 2), (width * l) / total));
  const scale = width / widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.floor(w * scale));
  const tblStyle = ctx.plan.id("table");
  const cell = (c, i, header) => {
    const jc = JC[t.align?.[i]] ? `<w:jc w:val="${JC[t.align[i]]}"/>` : "";
    return `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/></w:tcPr>${para({ jc }, inlines(c?.tokens ?? [], ctx, header ? { b: true } : {}))}</w:tc>`;
  };
  const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${t.header.map((c, i) => cell(c, i, true)).join("")}</w:tr>`;
  const rows = t.rows.map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${t.header.map((_, i) => cell(r[i], i, false)).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="${esc(tblStyle)}"/><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLook w:val="0420" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${header}${rows}</w:tbl>`;
}

const TAGS = { b: "b", strong: "b", i: "i", em: "i", u: "u", s: "strike", del: "strike", strike: "strike", sub: "sub", sup: "sup", code: "code" };

/** Runs for inline tokens, carrying bold, italic, strike, code and links down. */
function inlines(tokens, ctx, fmt) {
  let out = "";
  let state = { ...fmt };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case "text":
      case "escape":
        out += t.tokens && t.type === "text" ? inlines(t.tokens, ctx, state) : runs(t.text, state);
        break;
      case "strong":
        out += inlines(t.tokens, ctx, { ...state, b: true });
        break;
      case "em":
        out += inlines(t.tokens, ctx, { ...state, i: true });
        break;
      case "del":
        out += inlines(t.tokens, ctx, { ...state, strike: true });
        break;
      case "codespan":
        out += runs(t.text, { ...state, code: true });
        break;
      case "br":
        out += "<w:r><w:br/></w:r>";
        break;
      case "link": {
        if (!t.href || t.href.startsWith("#")) {
          out += inlines(t.tokens, ctx, state);
          break;
        }
        const rId = ctx.link(t.href);
        out += `<w:hyperlink r:id="${rId}" w:history="1">${inlines(t.tokens, ctx, { ...state, link: ctx.plan.id("hyperlink") })}</w:hyperlink>`;
        break;
      }
      case "image": {
        const attrs = imageAttrs(t, tokens[i + 1]);
        if (attrs.consumed) tokens[i + 1] = { ...tokens[i + 1], text: tokens[i + 1].text.slice(attrs.consumed), tokens: undefined };
        out += image(t, attrs, ctx);
        break;
      }
      case "html": {
        const tag = t.text.match(/^<\s*(\/)?\s*([a-z]+)[^>]*?(\/)?\s*>$/i);
        if (/^<br\s*\/?>$/i.test(t.text)) out += "<w:r><w:br/></w:r>";
        else if (tag && TAGS[tag[2].toLowerCase()]) state = { ...state, [TAGS[tag[2].toLowerCase()]]: !tag[1] };
        else if (!/^<!--/.test(t.text) && !tag) out += runs(t.text, state);
        break;
      }
      default:
        if (t.tokens) out += inlines(t.tokens, ctx, state);
        else if (t.text) out += runs(t.text, state);
    }
  }
  return out;
}

function rPr(fmt) {
  let x = "";
  if (fmt.link) x += `<w:rStyle w:val="${esc(fmt.link)}"/>`;
  if (fmt.code) x += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
  if (fmt.b) x += "<w:b/><w:bCs/>";
  if (fmt.i) x += "<w:i/><w:iCs/>";
  if (fmt.strike) x += "<w:strike/>";
  if (fmt.u) x += '<w:u w:val="single"/>';
  if (fmt.code) x += '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
  if (fmt.sub || fmt.sup) x += `<w:vertAlign w:val="${fmt.sup ? "superscript" : "subscript"}"/>`;
  return x ? `<w:rPr>${x}</w:rPr>` : "";
}

/** One run for a piece of text: line breaks become <w:br/>, tabs <w:tab/>. */
export function runs(text, fmt) {
  if (text == null || text === "") return "";
  const parts = String(text).split(/(\n|\t)/);
  const inner = parts.map((p) => (p === "\n" ? "<w:br/>" : p === "\t" ? "<w:tab/>" : p ? `<w:t xml:space="preserve">${esc(p)}</w:t>` : "")).join("");
  return `<w:r>${rPr(fmt)}${inner}</w:r>`;
}

function image(t, attrs, ctx) {
  const img = ctx.image(t.href, attrs, t.text || t.title || "");
  ctx.count("images");
  const descr = esc(plain(t.tokens) || t.text || "");
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${img.cx}" cy="${img.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${img.id}" name="Picture ${img.id}" descr="${descr}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${img.id}" name="${esc(img.name)}" descr="${descr}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${img.rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}
