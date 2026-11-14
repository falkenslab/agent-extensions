// What Asker's own messages leave unclear, found before it runs: invisible characters, indentation,
// empty definitions, files and links that won't load, a %map without its language, XML that isn't
// well formed, and files next to the input that Asker would take for inputs. Each with its line, and
// Asker's messages explained when they're known.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { LANGUAGES } from "./config.js";

export interface Hint {
  /** The file it's about, by name. */
  file: string;
  /** Its line, when there's one. */
  line?: number;
  message: string;
}

const MEDIA = /\.(png|jpe?g|mp3|ogg|wav|mp4|ogv)$/i;
const INVISIBLE = /[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/;
const KEYWORD = /^(\s*)%(\w+)(\{[^}]*\})?\s*(.*)$/;

const isUrl = (value: string) => /^https?:\/\//i.test(value);
const urlPath = (value: string) => value.split(/[?#]/)[0] ?? value;

/** A file Asker embeds or reads: one that's there, or a link straight to a medium. */
function fileProblem(value: string, folder: string, what: string): string | undefined {
  if (!value) return `${what} names no file`;
  if (isUrl(value)) return MEDIA.test(urlPath(value)) ? undefined : `${what} is a link that doesn't end in an image, audio or video file name (.png, .jpg, .jpeg, .mp3, .ogg, .wav, .mp4, .ogv): Asker can't use it. A shared-file page (Google Drive, OneDrive…) isn't the file itself: link straight to the file, or save it next to the input`;
  return existsSync(path.resolve(folder, value)) ? undefined : `${what} names ${value}, which isn't there: paths are relative to the input's folder`;
}

/** The hints for a HAML input. */
function lintHaml(file: string, text: string): Hint[] {
  const name = path.basename(file);
  const folder = path.dirname(file);
  const hints: Hint[] = [];
  const add = (line: number | undefined, message: string) => hints.push({ file: name, ...(line ? { line } : {}), message });
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/);
  let sawMap = false;
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    if (/^\s*\/\//.test(raw)) return; // a comment
    if (raw.includes("\t")) add(line, "has a tab: Asker's HAML counts spaces, so indent with spaces only");
    if (INVISIBLE.test(raw)) add(line, "has an invisible character (a non-breaking or zero-width space): delete it and type a normal space, or retype the line");
    const indent = /^ */.exec(raw)?.[0].length ?? 0;
    if (indent % 2 === 1) add(line, `is indented with ${indent} spaces: Asker indents in steps of two (0 for %map, 2 for %concept, 4 for its keywords, 6 for %row, 8 or 10 for %col)`);
    const keyword = KEYWORD.exec(raw);
    if (!keyword) return;
    const [, , tag = "", attributes, value = ""] = keyword;
    if (!sawMap) {
      sawMap = true;
      if (tag !== "map") add(line, "is the first line, and it must be the %map{ lang: '…', context: '…', version: '1'}");
    }
    if (tag === "map") {
      const lang = /lang:\s*'([^']*)'/.exec(attributes ?? "")?.[1] ?? /:lang\s*=>\s*'([^']*)'/.exec(attributes ?? "")?.[1];
      if (!/context/.test(attributes ?? "")) add(line, "%map has no context: Asker needs one (comma-separated words for what the file is about)");
      if (!lang) add(line, `%map has no lang: Asker needs one (${LANGUAGES.join(", ")})`);
      else if (!(LANGUAGES as readonly string[]).includes(lang)) add(line, `%map's lang is '${lang}': Asker writes questions in ${LANGUAGES.join(", ")} only`);
    }
    if (tag === "def") {
      if (/%def\s+\{/.test(raw)) add(line, "has a space between %def and {: write %def{ type: 'file'} with no space");
      else if (!value.trim()) add(line, "is a %def with no text: write the definition, or delete the line");
      else if (/type:\s*'file'/.test(attributes ?? "")) {
        const problem = fileProblem(value.trim(), folder, "this %def");
        if (problem) add(line, problem);
      }
    }
    if (tag === "path") {
      const problem = fileProblem(value.trim(), folder, "this %path");
      if (problem) add(line, problem);
    }
    if ((tag === "names" || tag === "tags") && !value.trim()) add(line, `is a %${tag} with nothing after it`);
  });
  if (!sawMap) add(undefined, "has no %map line: an Asker input starts with %map{ lang: '…', context: '…', version: '1'}");
  return hints;
}

/** The hints for an XML input: well formed, a <map> with its lang, and its files. */
function lintXml(file: string, text: string): Hint[] {
  const name = path.basename(file);
  const folder = path.dirname(file);
  const hints: Hint[] = [];
  let failure: { message: string; line?: number } | undefined;
  let map: ReturnType<DOMParser["parseFromString"]>["documentElement"] | undefined;
  try {
    map = new DOMParser({
      onError: (level, message, context) => {
        if (level !== "warning" && !failure) failure = { message: message.split("\n")[0] ?? message, ...(context?.locator?.lineNumber ? { line: context.locator.lineNumber } : {}) };
      },
    }).parseFromString(text, "text/xml").documentElement ?? undefined;
  } catch (error) {
    const located = error as { message?: string; locator?: { lineNumber?: number } };
    failure ??= { message: (located.message ?? String(error)).split("\n")[0] ?? "", ...(located.locator?.lineNumber ? { line: located.locator.lineNumber } : {}) };
  }
  if (failure) return [{ file: name, ...(failure.line ? { line: failure.line } : {}), message: `isn't well-formed XML: ${failure.message}` }];
  if (!map || map.tagName !== "map") return [{ file: name, message: `isn't an Asker input: its root is <${map?.tagName ?? "nothing"}>, not <map>` }];
  const lang = map.getAttribute("lang");
  if (!map.getAttribute("context")) hints.push({ file: name, message: "<map> has no context: Asker needs one (comma-separated words for what the file is about)" });
  if (!lang) hints.push({ file: name, message: `<map> has no lang: Asker needs one (${LANGUAGES.join(", ")})` });
  else if (!(LANGUAGES as readonly string[]).includes(lang)) hints.push({ file: name, message: `<map>'s lang is '${lang}': Asker writes questions in ${LANGUAGES.join(", ")} only` });
  for (const def of Array.from(map.getElementsByTagName("def"))) {
    const value = (def.textContent ?? "").trim();
    if (!value) hints.push({ file: name, message: "has a <def> with no text" });
    else if (def.getAttribute("type") === "file") {
      const problem = fileProblem(value, folder, `the <def type='file'> ${value}`);
      if (problem) hints.push({ file: name, message: problem });
    }
  }
  return hints;
}

/** Hints for an input, before Asker runs: an empty list when nothing stands out. */
export function lintInput(file: string): Hint[] {
  const name = path.basename(file);
  const buffer = readFileSync(file);
  const text = buffer.toString("utf8");
  if (!text.trim()) return [{ file: name, message: "is empty" }];
  const hints: Hint[] = [];
  if (text.startsWith("\ufeff")) hints.push({ file: name, line: 1, message: "starts with an invisible byte-order mark (BOM), which Asker reads as spaces before %map: save it as UTF-8 without BOM" });
  if (text.includes("�")) hints.push({ file: name, message: "isn't saved as UTF-8 (some characters can't be read): save it as UTF-8" });
  return [...hints, ...(path.extname(file).toLowerCase() === ".xml" ? lintXml(file, text) : lintHaml(file, text))];
}

/** Whether a .haml or .xml file is an Asker input at all: its first element is a %map or <map>. */
export function looksLikeInput(file: string): boolean {
  let text: string;
  try {
    text = readFileSync(file, "utf8").replace(/^\ufeff/, "");
  } catch {
    return false;
  }
  if (path.extname(file).toLowerCase() === ".xml") return /^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<map[\s>]/.test(text);
  const first = text.split(/\r?\n/).find((line) => line.trim() && !/^\s*\/\//.test(line));
  return first !== undefined && /^%map\b/.test(first.trim());
}

/** The .haml and .xml files next to an input that aren't Asker inputs: Asker would read them and stop. */
export function foreignNeighbours(file: string): string[] {
  const folder = path.dirname(file);
  return readdirSync(folder)
    .filter((name) => /\.(haml|xml)$/i.test(name) && path.join(folder, name) !== file)
    .filter((name) => !looksLikeInput(path.join(folder, name)))
    .sort();
}

/** The error for an input whose folder has files Asker would take for inputs. */
export function foreignNeighboursError(files: string[]): string {
  return `Asker reads every .haml and .xml file in the input's folder, and ${files.length === 1 ? "this one isn't an Asker input" : "these aren't Asker inputs"}: ${files.join(", ")}. It would stop on ${files.length === 1 ? "it" : "them"}. Move ${files.length === 1 ? "it" : "them"} out of the folder (a -moodle.xml written there by an earlier run is one), or move the input to a folder of its own.`;
}

const EXPLAINED: [RegExp, string][] = [
  [/Write \d+ spaces before %|Remove spaces before %map|Inconsistent indentation|Illegal nesting/, "Indentation: Asker's HAML needs exact spaces (0 before %map, 2 before %concept, 4 before its keywords, 6 before %row, 8 or 10 before %col), no tabs and no invisible characters; the hints say which lines."],
  [/Unknown URL type/, "A %def links to a page, not to an image, audio or video file: link straight to the file (its address ends in .png, .jpg, .mp3…), or save the file next to the input and give its path."],
  [/File does not exist/, "A %def or %path names a file that isn't there: its path is relative to the input's folder."],
  [/Unknown Lang with \[code=\]/, "A file Asker read has no lang in its %map, or isn't an Asker input at all (a Moodle XML in the same folder, say)."],
  [/Unknown Lang with \[code=/, `The %map's lang isn't one Asker knows: ${LANGUAGES.join(", ")}.`],
  [/columns size != table\.fields\.size/, "A table's row has a different number of %col than the table's fields: every %row needs one %col per field, in order."],
  [/Format error|ParseException|undefined local variable or method 'msg'/, "The XML isn't well formed: the hints give the line."],
  [/read_context_attribute/, "The %map has no context: add context: '…' (comma-separated words for what the file is about)."],
  [/class or module required for rescue clause/, "Asker couldn't read the file's %map: it's empty, its first line isn't a %map, or the %map lacks lang or context."],
  [/Haml::SyntaxError|syntax errors found/, "HAML can't parse a line (the number after (haml): is the line): often a line that starts with a character HAML treats as code, such as = - ! & ~ or #{, or a %keyword written wrong."],
  [/Parent\(map\) not found/, "The file has to start with its %map line."],
  [/Unknown tag/, "A keyword is misspelled, or in the wrong place: see asker_input_reference for the keywords each part takes."],
];

/** Asker's messages in plain words, where they're known; nothing for the others. */
export function explain(messages: string[]): string[] {
  const out: string[] = [];
  for (const message of messages) for (const [pattern, text] of EXPLAINED) if (pattern.test(message) && !out.includes(text)) { out.push(text); break; }
  return out;
}

/** Asker's error with the neighbour it comes from said, when it's about another file in the folder. */
export function attribute(error: string, input: string): string {
  const name = path.basename(input.replace(/\\/g, "/"));
  const mentioned = /\(([^()]*\.(?:haml|xml))\)/i.exec(error)?.[1];
  if (!mentioned) return error;
  const other = path.basename(mentioned.replace(/\\/g, "/"));
  return other && other !== name ? `In ${other}, another file in the input's folder that Asker reads too: ${error}` : error;
}
