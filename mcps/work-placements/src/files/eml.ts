// Email drafts as .eml files (RFC 5322 with MIME): "X-Unsent: 1" makes Outlook open one as a draft to
// send, and Thunderbird opens it to edit and send. Nothing here sends anything.
import { existsSync } from "node:fs";
import path from "node:path";
import type { Company } from "../record/model.js";

/** The placeholders a template may use, and where each comes from. */
export const PLACEHOLDERS: Record<string, (c: Company) => string | undefined> = {
  name: (c) => c.name,
  town: (c) => c.town,
  sector: (c) => c.sector,
  address: (c) => c.address,
  email: (c) => c.email,
  phone: (c) => c.phone,
  website: (c) => c.website,
  tax_id: (c) => c.taxId,
  contact_name: (c) => c.people?.[0]?.name,
  contact_role: (c) => c.people?.[0]?.role,
};

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*(?:\|([^}]*))?\}\}/g;

/** Placeholders the template names that don't exist. */
export function unknownPlaceholders(...templates: string[]): string[] {
  const names = templates.flatMap((t) => [...t.matchAll(PLACEHOLDER)].map((m) => m[1] ?? ""));
  return [...new Set(names.filter((n) => !(n in PLACEHOLDERS)))];
}

/** The template filled in for a company; missing lists placeholders without a value or a fallback. */
export function fill(template: string, company: Company): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = template.replace(PLACEHOLDER, (_, name: string, fallback?: string) => {
    const value = PLACEHOLDERS[name]?.(company);
    if (value) return value;
    if (fallback !== undefined) return fallback;
    missing.push(name);
    return "";
  });
  return { text, missing };
}

/** A header value, as RFC 2047 encoded words when it isn't plain ASCII. */
export function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  const words: string[] = [];
  let chunk = "";
  for (const char of value) {
    if (Buffer.byteLength(chunk + char) > 45) {
      words.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w).toString("base64")}?=`).join("\r\n ");
}

/** An address header: "Name <a@b>" with the name encoded when needed. */
export function addressHeader(address: string, name?: string): string {
  return name ? `${encodeHeader(/[",;<>@()]/.test(name) ? `"${name.replace(/"/g, "")}"` : name)} <${address}>` : address;
}

/** Text as quoted-printable (RFC 2045), lines of at most 76 characters. */
export function quotedPrintable(text: string): string {
  return text
    .replace(/\r?\n/g, "\n")
    .split("\n")
    .map((line) => {
      let out = "";
      let length = 0;
      const bytes = Buffer.from(line, "utf8");
      bytes.forEach((byte, i) => {
        const last = i === bytes.length - 1;
        const plain = (byte >= 33 && byte <= 126 && byte !== 61) || (byte === 32 && !last) || (byte === 9 && !last);
        const piece = plain ? String.fromCharCode(byte) : `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
        if (length + piece.length > 75) {
          out += "=\r\n";
          length = 0;
        }
        out += piece;
        length += piece.length;
      });
      return out;
    })
    .join("\r\n");
}

export interface Draft {
  to: string;
  subject: string;
  body: string;
  from?: string;
  fromName?: string;
  cc?: string;
}

/** The .eml's text: headers, then the body in quoted-printable UTF-8. */
export function emlText(draft: Draft): string {
  const headers = [
    ...(draft.from ? [`From: ${addressHeader(draft.from, draft.fromName)}`] : []),
    `To: ${draft.to}`,
    ...(draft.cc ? [`Cc: ${draft.cc}`] : []),
    `Subject: ${encodeHeader(draft.subject)}`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${quotedPrintable(draft.body)}\r\n`;
}

/** A file name from a company's name: lowercase, ASCII, dashes. */
export function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "company"
  );
}

/** A path in dir that doesn't exist yet: name.ext, else name-2.ext, name-3.ext… Nothing is overwritten. */
export function freePath(dir: string, name: string, ext: string, taken: Set<string> = new Set()): string {
  for (let n = 1; ; n++) {
    const file = path.join(dir, `${name}${n > 1 ? `-${n}` : ""}${ext}`);
    if (!existsSync(file) && !taken.has(file)) {
      taken.add(file);
      return file;
    }
  }
}

/** A template from a text file: an optional first line "Subject: …", then the body. */
export function parseTemplateFile(text: string): { subject?: string; body: string } {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = clean.match(/^(?:subject|asunto)\s*:\s*(.*)\n+/i);
  return match ? { subject: match[1]?.trim() ?? "", body: clean.slice(match[0].length) } : { body: clean };
}
