// Reading Asker's Moodle XML, its only complete output (its GIFT leaves out drag-and-drop matching, its
// YAML the questions from code). Each question's name says where it comes from: its concept, problem or
// code file, a number, and a code for the kind of question ("AC/DC-4-d2true", "first2-30-07ps3short",
// "string.py-7-code1syntaxerror"); Asker doesn't always put the dash before the code ("AC/DC-22t5table").
import { DOMParser, type Element } from "@xmldom/xmldom";

/** Where a question comes from in Asker's terms: a concept's question type, a problem's, or code. */
export const KINDS = ["definitions", "table-matching", "one-field-tables", "files", "sequences", "table-rows", "problem-answers", "problem-steps", "code", "other"] as const;
export type Kind = (typeof KINDS)[number];

const CONCEPT_KINDS: Record<string, Kind> = { d: "definitions", b: "table-matching", f: "one-field-tables", i: "files", s: "sequences", t: "table-rows" };

export interface QuestionName {
  /** The concept's first name, the problem's name or the code file's. */
  group: string;
  number: number;
  kind: Kind;
  /** Asker's question template, as its docs name them: "d2def-misspelled", "t5table", "b1match4x5", "08ps6ordering", "code1keyword". */
  template: string;
}

// The last "-<number>" followed, after a dash or straight away, by a code Asker uses: a concept's
// letter and a digit, a problem's "<digits>pa"/"<digits>ps" and a digit, or "code" and a digit.
const NAME = /^(.*)-(\d+)(?:-|(?=[a-z]))((?:[dbfist]\d|\d+p[as]\d|code\d).*)$/;

/** Splits an Asker question's name into where it comes from and its kind. */
export function parseName(name: string): QuestionName {
  const match = NAME.exec(name);
  if (!match) return { group: name, number: 0, kind: "other", template: "" };
  const [, group = name, number = "0", code = ""] = match;
  const problem = /^\d+p([as])/.exec(code);
  const kind: Kind = problem ? (problem[1] === "a" ? "problem-answers" : "problem-steps") : code.startsWith("code") ? "code" : (CONCEPT_KINDS[code[0] ?? ""] ?? "other");
  // A table's questions end in its fields ("-$attribute$value"), and some templates in a count ("f1short4").
  const template = code.replace(/-\$.*$/, "").replace(/^([dfi]\d[a-z-]+?)\d+$/, "$1");
  return { group, number: Number.parseInt(number, 10), kind, template };
}

export interface Option {
  text: string;
  /** Moodle's grade for choosing it, in percent: 100 the right one, negative a penalty. */
  fraction: number;
  correct: boolean;
}

export interface Pair {
  /** What's matched; empty for an extra answer that matches nothing. */
  prompt: string;
  answer: string;
}

export interface Question {
  name: string;
  group: string;
  kind: Kind;
  /** Asker's question template ("d2def-misspelled", "t5table"…): what kind of question it is, and what generate_questions' exclude can name. */
  template: string;
  /** Moodle's question type: truefalse, multichoice, shortanswer, matching, ddmatch, ordering… */
  type: string;
  /** The question's text, as plain text: code keeps its lines, files show as [image: …], [audio: …]. */
  text: string;
  /** truefalse: the right answer. */
  correct?: boolean;
  /** multichoice: every option. */
  options?: Option[];
  /** shortanswer: every accepted answer. */
  accepted?: string[];
  /** matching and ddmatch: each prompt with its answer. */
  pairs?: Pair[];
  /** ordering: the items in their right order. */
  order?: string[];
  /** Feedback shown after answering, when there's any. */
  feedback?: string;
  /** Files embedded in the question (images, audio, video). */
  files?: string[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** HTML as plain text for reading: line breaks kept, tags dropped, media named. */
export function plainText(html: string): string {
  return html
    .replace(/<img\b[^>]*\bsrc\s*=\s*"([^"]*)"[^>]*>/gi, (_, src: string) => ` [image: ${src.replace("@@PLUGINFILE@@/", "")}] `)
    .replace(/<audio\b[\s\S]*?<source\b[^>]*\bsrc\s*=\s*"([^"]*)"[\s\S]*?<\/audio>/gi, (_, src: string) => ` [audio: ${src.replace("@@PLUGINFILE@@/", "")}] `)
    .replace(/<video\b[\s\S]*?<source\b[^>]*\bsrc\s*=\s*"([^"]*)"[\s\S]*?<\/video>/gi, (_, src: string) => ` [video: ${src.replace("@@PLUGINFILE@@/", "")}] `)
    .replace(/<\/?br\s*\/?>|<\/p>|<\/pre>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const children = (element: Element, tag: string): Element[] => Array.from(element.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).tagName === tag);
const child = (element: Element, tag: string): Element | undefined => children(element, tag)[0];
const textOf = (element: Element | undefined): string => (element ? (child(element, "text")?.textContent ?? "") : "");

export interface QuestionFile {
  /** The category it imports into, when the file sets one. */
  category?: string;
  questions: Question[];
}

/** Reads a Moodle XML file of questions. */
export function readMoodleXml(xml: string): QuestionFile {
  const errors: string[] = [];
  let quiz: Element | null;
  try {
    quiz = new DOMParser({ onError: (level, message) => void (level !== "warning" && errors.push(message)) }).parseFromString(xml, "text/xml").documentElement;
  } catch (error) {
    throw new Error(`This isn't a Moodle XML file of questions: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  if (errors.length || !quiz || quiz.tagName !== "quiz") throw new Error(`This isn't a Moodle XML file of questions${errors[0] ? `: ${errors[0]}` : ""}`);
  let category: string | undefined;
  const questions: Question[] = [];
  for (const element of children(quiz, "question")) {
    const type = element.getAttribute("type") ?? "";
    if (type === "category") {
      category = child(element, "category") ? textOf(child(element, "category")) : category;
      continue;
    }
    const name = textOf(child(element, "name"));
    const html = textOf(child(element, "questiontext"));
    const { group, kind, template } = parseName(name);
    const question: Question = { name, group, kind, template, type, text: plainText(html) };
    const feedback = plainText(textOf(child(element, "generalfeedback")));
    if (feedback) question.feedback = feedback;
    const files = [...html.matchAll(/@@PLUGINFILE@@\/([^"'\s>]+)/g)].map((m) => decodeURIComponent(m[1] ?? ""));
    if (files.length) question.files = [...new Set(files)];

    const answers = children(element, "answer").map((a) => ({ text: plainText(textOf(a)), fraction: Number.parseFloat(a.getAttribute("fraction") ?? "0") }));
    if (type === "truefalse") question.correct = answers.find((a) => a.fraction > 0)?.text.toLowerCase() === "true";
    else if (type === "multichoice") question.options = answers.map((a) => ({ text: a.text, fraction: a.fraction, correct: a.fraction > 0 }));
    else if (type === "shortanswer" || type === "numerical") question.accepted = answers.filter((a) => a.fraction > 0).map((a) => a.text);
    else if (type === "ordering") question.order = [...answers].sort((a, b) => a.fraction - b.fraction).map((a) => a.text);
    else if (type === "matching" || type === "ddmatch")
      question.pairs = children(element, "subquestion").map((s) => ({ prompt: plainText(textOf(s)), answer: plainText(textOf(child(s, "answer"))) }));
    else if (answers.length) question.options = answers.map((a) => ({ text: a.text, fraction: a.fraction, correct: a.fraction > 0 }));
    questions.push(question);
  }
  return { ...(category !== undefined ? { category } : {}), questions };
}

/** Question types that a Moodle may not have: ddmatch is a plugin, ordering is in Moodle 4.4 and later or a plugin. */
export const PLUGIN_TYPES: Record<string, string> = {
  ddmatch: "drag-and-drop matching (ddmatch), a plugin many Moodle sites don't have; GIFT can't hold it either",
  ordering: "ordering, standard from Moodle 4.4 and a plugin before",
};

export interface Counts {
  total: number;
  byKind: Partial<Record<Kind, number>>;
  byType: Record<string, number>;
}

export interface GroupCounts extends Counts {
  group: string;
}

const add = (counts: Counts, question: Question) => {
  counts.total++;
  counts.byKind[question.kind] = (counts.byKind[question.kind] ?? 0) + 1;
  counts.byType[question.type] = (counts.byType[question.type] ?? 0) + 1;
};

/** How many questions there are, in all and per concept, problem or code file, by kind and by Moodle type. */
export function countQuestions(questions: Question[]): { all: Counts; groups: GroupCounts[] } {
  const all: Counts = { total: 0, byKind: {}, byType: {} };
  const groups = new Map<string, GroupCounts>();
  for (const question of questions) {
    add(all, question);
    if (!groups.has(question.group)) groups.set(question.group, { group: question.group, total: 0, byKind: {}, byType: {} });
    add(groups.get(question.group)!, question);
  }
  return { all, groups: [...groups.values()] };
}

/** Notes about types a Moodle may not take, for the questions given. */
export function typeNotes(counts: Counts): string[] {
  return Object.entries(PLUGIN_TYPES)
    .filter(([type]) => counts.byType[type])
    .map(([type, note]) => `${counts.byType[type]} ${type} question${counts.byType[type] === 1 ? "" : "s"}: ${note}. exclude_questions can leave them out by type.`);
}
