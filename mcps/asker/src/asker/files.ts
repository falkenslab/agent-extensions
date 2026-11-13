// Changing a question file without rewriting any question: leaving whole questions out of a Moodle XML
// or GIFT file, and putting a category at the top of a Moodle XML (Asker writes it only in GIFT).
// Everything else stays byte for byte.

// A Moodle XML question, with the indentation before it and the line break after it.
const XML_QUESTION = /[ \t]*<question type="([^"]*)">[\s\S]*?<\/question>[ \t]*\r?\n?/g;
const XML_NAME = /<name>\s*<text>([\s\S]*?)<\/text>/;

const unescapeXml = (text: string) =>
  text
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export interface Removal {
  text: string;
  /** The questions kept, by name. */
  kept: string[];
  /** The questions left out, by name. */
  removed: string[];
}

/** Which questions to leave out: by exact name, and every question of some Moodle types. */
export interface Selection {
  names?: string[];
  types?: string[];
}

const leaveOut = (selection: Selection, name: string, type: string | undefined) =>
  (selection.names ?? []).includes(name) || (type !== undefined && (selection.types ?? []).includes(type));

/** A Moodle XML file without the questions selected. A category entry is never left out. */
export function removeFromMoodleXml(xml: string, selection: Selection): Removal {
  const kept: string[] = [];
  const removed: string[] = [];
  const text = xml.replace(XML_QUESTION, (block, type: string) => {
    if (type === "category") return block;
    const name = unescapeXml(XML_NAME.exec(block)?.[1]?.trim() ?? "");
    if (leaveOut(selection, name, type)) {
      removed.push(name);
      return "";
    }
    kept.push(name);
    return block;
  });
  return { text, kept, removed };
}

// GIFT separates questions with blank lines; a question starts with its name, ::name::.
// The shortest name up to a "::" that isn't followed by another ":", so a name ending in ":" (a table
// field "features:") keeps it: "::router-9-f1short4-$features:::[html]…".
const GIFT_NAME = /^::((?:\\.|[^\\\n])*?)::(?!:)/m;

const unescapeGift = (text: string) => text.replace(/\\([:~=#{}\\])/g, "$1");

/** Moodle's type of a GIFT question, as far as it shows: enough to leave out a type. */
function giftType(block: string): string | undefined {
  const answer = /\{([\s\S]*)\}\s*$/.exec(block)?.[1]?.trim();
  if (answer === undefined) return undefined;
  if (/^(T|F|TRUE|FALSE)(#|$)/i.test(answer)) return "truefalse";
  if (/->/.test(answer)) return "matching";
  if (/(^|\s)~/.test(answer)) return "multichoice";
  if (/^=/.test(answer)) return "shortanswer";
  return undefined;
}

/**
 * A GIFT file without the questions selected; comments and the category stay. A block between blank
 * lines can start with comment lines (a concept's header) and, in Asker's GIFT, hold more than one
 * question: each starts on a line with its ::name::.
 */
export function removeFromGift(gift: string, selection: Selection): Removal {
  const kept: string[] = [];
  const removed: string[] = [];
  const newline = gift.includes("\r\n") ? "\r\n" : "\n";
  const blocks = gift.split(/(\r?\n[ \t]*\r?\n)/);
  const out: string[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const block = blocks[i] ?? "";
    const separator = blocks[i + 1] ?? "";
    const lines = block.split(/\r?\n/);
    const starts = lines.flatMap((line, index) => (line.startsWith("::") ? [index] : []));
    if (!starts.length) {
      out.push(block, separator);
      continue;
    }
    const preamble = lines.slice(0, starts[0]).join(newline);
    const questions = starts.map((start, n) => lines.slice(start, starts[n + 1] ?? lines.length).join(newline));
    const keep = questions.filter((question) => {
      const name = unescapeGift(GIFT_NAME.exec(question)?.[1] ?? "");
      if (leaveOut(selection, name, giftType(question))) {
        removed.push(name);
        return false;
      }
      kept.push(name);
      return true;
    });
    if (keep.length === questions.length) {
      out.push(block, separator);
      continue;
    }
    const rest = [preamble, keep.join(`${newline}${newline}`)].filter(Boolean).join(newline);
    out.push(rest, rest ? separator : "");
  }
  return { text: out.join(""), kept, removed };
}

/** Asker's GIFT puts this, without a line break, in place of a ddmatch question's answers: the next question's name follows it. */
export const GIFT_DDMATCH_WARNING = "// WARNING: can't export ddmatch questions to this format";

/**
 * Asker's GIFT with its drag-and-drop matching questions out: GIFT can't hold them, so Asker writes
 * their text without answers and then a warning that comments out the next question's first line.
 * The warning goes (the next question is whole again) and so do the ddmatch questions.
 */
export function repairAskerGift(gift: string, ddmatchNames: string[]): Removal {
  const restored = gift.split(`${GIFT_DDMATCH_WARNING}::`).join("::").split(GIFT_DDMATCH_WARNING).join("");
  return removeFromGift(restored, { names: ddmatchNames });
}

/** The questions of a GIFT file by name, each with the header it's under ("Concept name: AC/DC"…). */
export function giftNames(gift: string): string[] {
  return [...gift.matchAll(new RegExp(GIFT_NAME.source, "gm"))].map((m) => unescapeGift(m[1] ?? ""));
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Asker's Moodle XML with the plain-text values it forgets to escape escaped: it writes an answer such
 * as "mysql -u root < data.sql" into a <text> without CDATA, which leaves the file unreadable, by
 * Moodle too. Only <text> elements without CDATA change, and what they say stays the same.
 */
export function repairAskerXml(xml: string): { text: string; repaired: number; ordering: number } {
  let repaired = 0;
  let ordering = 0;
  const text = xml
    .replace(/<text>(?!<!\[CDATA\[)([^]*?)<\/text>/g, (whole, inner: string) => {
      const escaped = inner.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (escaped === inner) return whole;
      repaired++;
      return `<text>${escaped}</text>`;
    })
    // Asker's ordering questions have no <shownumcorrect/>; without it Moodle's ordering type (4.4 and
    // later) makes up hint settings for hints that don't exist and fails to save the question
    // ("Error writing to database"). Moodle's own export has it.
    .replace(/<question type="ordering">[^]*?<\/question>/g, (block) => {
      if (/<shownumcorrect\s*\/?>/.test(block)) return block;
      ordering++;
      return block.replace(/(\n[ \t]*)<answer\b/, "$1<shownumcorrect/>$1<answer");
    });
  return { text, repaired, ordering };
}

/** A Moodle XML file with its questions in this category ("Unit 3/Bands" goes under the course's). */
export function setMoodleXmlCategory(xml: string, category: string): string {
  const path = category.startsWith("$course$") || category.startsWith("$system$") ? category : `$course$/${category}`;
  const entry = `\n  <question type="category">\n    <category>\n      <text>${escapeXml(path)}</text>\n    </category>\n  </question>\n`;
  const withoutOld = xml.replace(/[ \t]*<question type="category">[\s\S]*?<\/question>[ \t]*\r?\n?/g, "");
  const quizEnd = withoutOld.search(/<quiz>/);
  if (quizEnd < 0) throw new Error("This isn't a Moodle XML file of questions: it has no <quiz>");
  const at = quizEnd + "<quiz>".length;
  return withoutOld.slice(0, at) + entry + withoutOld.slice(at);
}

export interface SyntaxError {
  line: number;
  message: string;
  /** The start of the line, as Asker shows it. */
  source: string;
}

/** `asker check`'s errors: " 005 :   Write 4 spaces before %def. =>     %deff …". It shows at most 10. */
export function parseCheck(output: string): { ok: boolean; errors: SyntaxError[]; total?: number } {
  const errors: SyntaxError[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s*(\d+)\s*:\s*(.*?)\.\s=>\s?(.*)$/.exec(line);
    if (match) errors.push({ line: Number.parseInt(match[1] ?? "0", 10), message: (match[2] ?? "").trim(), source: (match[3] ?? "").trim() });
  }
  const total = /Revise (\d+) syntax warning/.exec(output)?.[1];
  const ok = /Syntax OK!/.test(output) && !errors.length;
  return { ok, errors, ...(total ? { total: Number.parseInt(total, 10) } : {}) };
}

/** Asker's own messages while loading and generating: errors and warnings, and how many it excluded. */
export function parseRun(output: string): { errors: string[]; warnings: string[]; excluded: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = output.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const error = /^\s*\[ERROR\]\s*(.*)$/.exec(line);
    const warning = /^\s*\[WARN\]\s*(.*)$/.exec(line);
    if (error) {
      // An error can go on over the next lines (the XML it's about), up to the next message.
      const more: string[] = [];
      while (i + 1 < lines.length && lines[i + 1] && !/^\s*(\[|==>)/.test(lines[i + 1] ?? "")) more.push((lines[++i] ?? "").trim());
      const text = [error[1], ...more].join(" ").trim();
      // Asker goes on with "[ERROR]           : what's wrong" after "[ERROR] HamlLoader: Can't load file (…)".
      if (text.startsWith(":") && errors.length) errors[errors.length - 1] += ` ${text.slice(1).trim()}`;
      else errors.push(text);
    } else if (warning) warnings.push((warning[1] ?? "").trim());
  }
  const excluded = [...output.matchAll(/\|\s*Excluded questions\s*\|\s*(\d+)/g)].reduce((sum, m) => sum + Number.parseInt(m[1] ?? "0", 10), 0);
  return { errors, warnings, excluded };
}
