// Text in a package as H5P's content validator (H5PContentValidator::validateText, h5p-php-library)
// leaves it when a site deploys it: a field with `tags` is HTML limited to those tags, any other text
// is plain and gets escaped. Here what the validator would strip is refused instead, saying what.
import type { Field } from "./libraries.js";

const TAG = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)\/?>/g;
const ATTRIBUTE = /([-a-zA-Z]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const SAFE_PROTOCOLS = ["ftp", "http", "https", "mailto"];
const COLOR = "(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\\([0-9, ]+\\)|hsla?\\([0-9,.% ]+\\))";

/** Whether a text has HTML tags (or comments) in it. */
export const hasTags = (text: string) => new RegExp(TAG.source).test(text);

/** Escapes text as H5P does plain text (htmlspecialchars, without encoding entities twice). */
export function escapeText(text: string): string {
  return escapeAmpersands(text).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const escapeAmpersands = (text: string) => text.replace(/&(?!#[0-9]+;|#[xX][0-9a-fA-F]+;|[A-Za-z][A-Za-z0-9]*;)/g, "&amp;");

/** The tags a field allows: its own plus the four H5P always adds, and those that go with them. */
export function allowedTags(field: Field): string[] {
  const tags = new Set(["div", "span", "p", "br", ...(field.tags ?? [])]);
  if (tags.has("table")) for (const t of ["tr", "td", "th", "colgroup", "col", "thead", "tbody", "tfoot", "figure", "figcaption"]) tags.add(t);
  if (tags.has("b")) tags.add("strong");
  if (tags.has("i")) tags.add("em");
  if (tags.has("ul") || tags.has("ol")) tags.add("li");
  if (tags.has("del") || tags.has("strike")) tags.add("s");
  return [...tags];
}

function allowedStyles(field: Field): RegExp[] {
  const font = field.font ?? {};
  const styles = [/^text-align: *(center|left|right);?$/i];
  if (font.size) styles.push(/^font-size: *[0-9.]+(em|px|%) *;?$/i);
  if (font.family) styles.push(/^font-family: *[-a-z0-9,'&; ]+;?$/i);
  if (font.color) styles.push(new RegExp(`^color: *${COLOR} *;?$`, "i"));
  if (font.background || field.tags?.includes("table")) styles.push(new RegExp(`^background-color: *${COLOR} *;?$`, "i"));
  if (font.spacing) styles.push(/^letter-spacing: *[0-9.]+(em|px|%) *;?$/i);
  if (font.height) styles.push(/^line-height: *[0-9.]+(em|px|%|) *;?$/i);
  if (field.tags?.includes("table")) {
    styles.push(
      new RegExp(`^border: *[0-9.]+(em|px|%|) *(none|solid|dotted|dashed|double|groove|ridge|inset|outset) *${COLOR} *;?$`, "i"),
      /^border-style: *(none|solid|dotted|dashed|double|groove|ridge|inset|outset) *;?$/i,
      /^border-width: *[0-9.]+(em|px|%|) *;?$/i,
      new RegExp(`^border-color: *${COLOR} *;?$`, "i"),
      /^vertical-align: *(middle|top|bottom);?$/i,
      /^(padding|width|height): *[0-9.]+(em|px|%|) *;?$/i,
      /^float: *(right|left|none) *;?$/i,
      /^border-collapse: *collapse *;?$/i,
    );
  }
  return styles;
}

/**
 * Checks HTML for a field with `tags` and returns it as the site would keep it (stray `&`, `<` and `>`
 * escaped), or the problems that would make the site change it.
 */
export function checkHtml(html: string, field: Field): { html: string; problems: string[] } {
  const tags = allowedTags(field);
  const styles = allowedStyles(field);
  const problems = new Set<string>();
  let out = "";
  let last = 0;
  for (const match of html.matchAll(TAG)) {
    out += escapeLoose(html.slice(last, match.index));
    last = match.index + match[0].length;
    const name = match[1]?.toLowerCase();
    if (!name) {
      problems.add("HTML comments aren't allowed");
      continue;
    }
    if (!tags.includes(name)) {
      problems.add(`<${name}> isn't allowed here (allowed: ${tags.join(", ")}); to show it as text, write &lt;${name}&gt;`);
      continue;
    }
    for (const attribute of (match[2] ?? "").matchAll(ATTRIBUTE)) {
      const attributeName = (attribute[1] ?? "").toLowerCase();
      const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? "";
      if (attributeName.startsWith("on")) problems.add(`event attributes such as ${attributeName} aren't allowed`);
      else if (attributeName === "style") {
        for (const declaration of value.split(";").map((d) => d.trim()).filter(Boolean)) {
          if (!styles.some((s) => s.test(declaration))) problems.add(`the style "${declaration}" isn't allowed here`);
        }
      } else if (unsafeProtocol(value)) problems.add(`the link "${value}" uses a protocol that isn't allowed (only ${SAFE_PROTOCOLS.join(", ")})`);
    }
    out += match[0];
  }
  out += escapeLoose(html.slice(last));
  return { html: out, problems: [...problems] };
}

const escapeLoose = (text: string) => escapeAmpersands(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");

function unsafeProtocol(uri: string): boolean {
  const colon = uri.indexOf(":");
  if (colon <= 0) return false;
  const protocol = uri.slice(0, colon);
  return !/[/?#]/.test(protocol) && !SAFE_PROTOCOLS.includes(protocol.toLowerCase());
}

/** Text without its tags, for checks on what a reader sees. */
export const textOf = (html: string) =>
  html
    .replace(new RegExp(TAG.source, "g"), " ")
    .replace(/&nbsp;/g, " ")
    .trim();
