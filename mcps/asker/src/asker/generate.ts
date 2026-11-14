// Running Asker on an input: checking it, and generating its questions into a folder. Asker runs in a
// temporary folder with the server's asker.ini and writes there; the files asked for are then copied
// to the person's folder. Asker reads every .haml and .xml next to the input (their concepts give it
// wrong answers) but generates only from the input itself.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { askerIni, type AskerOptions } from "./config.js";
import { GIFT_DDMATCH_WARNING, giftNames, parseCheck, parseRun, removeFromMoodleXml, repairAskerGift, repairAskerXml, setMoodleXmlCategory, type SyntaxError } from "./files.js";
import { countQuestions, readMoodleXml, typeNotes, type Counts, type GroupCounts, type Question } from "./questions.js";
import { attribute, explain, foreignNeighbours, foreignNeighboursError, lintInput, looksLikeInput, type Hint } from "./lint.js";
import { runAsker } from "./run.js";

export const INPUT_EXTENSIONS = [".haml", ".xml"];

/** Why a path can't be an Asker input, or undefined when it can. */
export function inputProblem(file: string): string | undefined {
  if (!path.isAbsolute(file)) return `${file}: give an absolute path`;
  if (!INPUT_EXTENSIONS.includes(path.extname(file).toLowerCase())) return `${file}: Asker reads .haml and .xml files`;
  if (!existsSync(file) || !statSync(file).isFile()) return `${file}: there's no such file`;
  return undefined;
}

/** The inputs a list of files and folders stands for: a folder gives its .haml and .xml files. */
export function expandInputs(paths: string[]): string[] {
  const files: string[] = [];
  for (const given of paths) {
    if (!path.isAbsolute(given)) throw new Error(`${given}: give an absolute path`);
    if (existsSync(given) && statSync(given).isDirectory()) {
      const inside = readdirSync(given)
        .filter((name) => INPUT_EXTENSIONS.includes(path.extname(name).toLowerCase()))
        .sort()
        .map((name) => path.join(given, name));
      if (!inside.length) throw new Error(`${given}: the folder has no .haml or .xml files`);
      files.push(...inside);
    } else {
      const problem = inputProblem(given);
      if (problem) throw new Error(problem);
      files.push(given);
    }
  }
  return [...new Set(files)];
}

/** The other Asker inputs in the same folder, which Asker reads too. */
export function neighbours(file: string): string[] {
  const dir = path.dirname(file);
  return readdirSync(dir)
    .filter((name) => INPUT_EXTENSIONS.includes(path.extname(name).toLowerCase()) && path.join(dir, name) !== file && looksLikeInput(path.join(dir, name)))
    .sort();
}

/** Hints that mean Asker can't read the file at all, so it isn't run. */
const blocking = (hints: Hint[]) => hints.some((h) => /^(is empty|isn't well-formed XML|isn't an Asker input|has no %map line)/.test(h.message));

const base = (file: string) => path.basename(file, path.extname(file));

/** A temporary folder with the server's asker.ini, removed afterwards. */
async function inWorkFolder<T>(options: Omit<AskerOptions, "outputFolder">, work: (folder: string, output: string) => Promise<T>): Promise<T> {
  const folder = mkdtempSync(path.join(tmpdir(), "asker-mcp-"));
  const output = path.join(folder, "output");
  try {
    writeFileSync(path.join(folder, "asker.ini"), askerIni({ ...options, outputFolder: output }));
    return await work(folder, output);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/** Questions Asker gave no question for: rows of its tables with 0. Asker cuts long names. */
function emptyRows(output: string): string[] {
  const rows: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^\|\s*(.+?)\s*\|\s*(\d+)\s*\|/.exec(line);
    if (!match || match[2] !== "0") continue;
    const name = match[1] ?? "";
    if (/^(Concept|Problem|Filename|Excluded questions|TOTAL\b|\d+ concept\/s)/.test(name)) continue;
    rows.push(name);
  }
  return rows;
}

export interface CheckResult {
  ok: boolean;
  /** asker check's verdict, for .haml files: each error with its line. */
  syntax?: { ok: boolean; errors: SyntaxError[]; total?: number };
  /** Errors and warnings Asker gave loading it. */
  errors: string[];
  warnings: string[];
  /** What it would generate with every question type, when it loads. */
  wouldGenerate?: { total: number; groups: GroupCounts[] };
  /** Concepts, problems or code files that would give no question (names as Asker shows them). */
  withoutQuestions: string[];
  /** The other inputs in its folder, which Asker reads for wrong answers. */
  alsoRead: string[];
  /** What stands out in the file before Asker runs, with its line: invisible characters, indentation, empty definitions, files and links. */
  hints: Hint[];
  /** Asker's messages in plain words, where they're known. */
  explained: string[];
}

/** Checks an input: Asker's syntax check (HAML), then a trial run whose files are thrown away. */
export async function checkInput(file: string): Promise<CheckResult> {
  const alsoRead = neighbours(file);
  const hints = lintInput(file);
  const common = { warnings: [] as string[], withoutQuestions: [] as string[], alsoRead, hints };
  const foreign = foreignNeighbours(file);
  if (foreign.length) return { ok: false, errors: [foreignNeighboursError(foreign)], explained: [], ...common };
  if (blocking(hints)) return { ok: false, errors: [], explained: [], ...common };
  return inWorkFolder({ exclude: ["ddmatch"] }, async (folder, output) => {
    let syntax: CheckResult["syntax"];
    if (path.extname(file).toLowerCase() === ".haml") {
      const checked = await runAsker(["check", file], { cwd: folder, timeoutMs: 120_000 });
      syntax = parseCheck(`${checked.stdout}\n${checked.stderr}`);
      if (!syntax.ok && !syntax.errors.length && !syntax.total) syntax.errors.push({ line: 0, message: firstLine(checked) || "Asker couldn't check it", source: "" });
    }
    // asker check also flags lines Asker loads past and ignores (%tags and %def in a %code, which mean
    // nothing there, as Asker's author confirmed in teuton-software/asker#30): the trial run always goes
    // ahead, and says whether Asker reads the file; the flagged lines still need fixing.
    const syntaxExplained = syntax && !syntax.ok ? explain(syntax.errors.map((e) => e.message)) : [];
    const run = await runAsker([file], { cwd: folder, timeoutMs: 600_000 });
    const said = `${run.stdout}\n${run.stderr}`;
    const parsed = parseRun(said);
    const errors = parsed.errors.map((e) => attribute(e, file));
    const xml = path.join(output, `${base(file)}-moodle.xml`);
    const ran = { ...common, warnings: parsed.warnings, withoutQuestions: emptyRows(said) };
    if (run.code !== 0 || !existsSync(xml)) {
      if (!errors.length) errors.push(firstLine(run) || `Asker stopped (exit code ${run.code})`);
      return { ok: false, ...(syntax ? { syntax } : {}), errors, explained: [...new Set([...syntaxExplained, ...explain(errors)])], ...ran };
    }
    // Counted as generate_questions makes them by default: without drag-and-drop matching.
    let read: Question[];
    try {
      read = readMoodleXml(repairAskerXml(readFileSync(xml, "utf8")).text).questions;
    } catch (error) {
      return { ok: false, ...(syntax ? { syntax } : {}), errors: [...errors, `Asker's Moodle XML can't be read: ${error instanceof Error ? error.message : String(error)}`], explained: explain(errors), ...ran };
    }
    const { all, groups } = countQuestions(read.filter((q) => q.type !== "ddmatch"));
    const lenient = syntax && !syntax.ok ? ["Asker reads the file and makes its questions, but asker check flags the lines in syntax: Asker ignores them as they are (%tags and %def in a %code, for one, mean nothing there). Fix or remove them so the file says only what Asker uses."] : [];
    return { ok: errors.length === 0, ...(syntax ? { syntax } : {}), errors, explained: [...new Set([...(errors.length ? [...syntaxExplained, ...explain(errors)] : []), ...lenient])], ...ran, wouldGenerate: { total: all.total, groups } };
  });
}

const firstLine = (run: { stdout: string; stderr: string }) =>
  `${run.stderr}\n${run.stdout}`
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("from "))
    ?.slice(0, 300);

export type Format = "moodle" | "gift" | "doc";

export interface GenerateOptions {
  inputs: string[];
  outputDir: string;
  formats: Format[];
  stages?: AskerOptions["stages"];
  category?: string;
  penalties?: boolean;
  exclude?: string[];
  /** Keep drag-and-drop matching questions (ddmatch). */
  ddmatch?: boolean;
  overwrite?: boolean;
}

export interface Generated {
  input: string;
  ok: boolean;
  /** The files written, by format. */
  files: Partial<Record<Format, string>>;
  counts?: Counts;
  groups?: GroupCounts[];
  /** How many Asker left out by name (exclude, and drag-and-drop matching unless asked for). */
  excludedByAsker: number;
  errors: string[];
  warnings: string[];
  notes: string[];
  /** When Asker can't read it: what stands out in the file, with its line. */
  hints?: Hint[];
  /** Asker's messages in plain words, where they're known. */
  explained?: string[];
}

const outputName: Record<Format, (b: string) => string> = { moodle: (b) => `${b}-moodle.xml`, gift: (b) => `${b}-gift.txt`, doc: (b) => `${b}.txt` };

/** The files a run would write, to refuse overwriting before anything runs. */
export function plannedOutputs(options: GenerateOptions): string[] {
  const inputs = expandInputs(options.inputs);
  const seen = new Map<string, string>();
  for (const input of inputs) {
    const name = base(input);
    if (seen.has(name)) throw new Error(`${seen.get(name)} and ${input} would write files with the same names (${name}-…): generate them into different folders`);
    seen.set(name, input);
  }
  return inputs.flatMap((input) => options.formats.map((format) => path.join(options.outputDir, outputName[format](base(input)))));
}

/** Generates the questions of every input, one Asker run each. */
export async function generate(options: GenerateOptions): Promise<Generated[]> {
  if (!path.isAbsolute(options.outputDir)) throw new Error(`${options.outputDir}: give an absolute folder`);
  const formats: Format[] = options.formats.length ? [...new Set(options.formats)] : ["moodle"];
  const planned = plannedOutputs({ ...options, formats });
  // Asker reads every .xml next to an input: a Moodle XML written there would stop its next run.
  if (formats.includes("moodle")) {
    const besideInput = expandInputs(options.inputs).find((input) => path.resolve(path.dirname(input)) === path.resolve(options.outputDir));
    if (besideInput)
      throw new Error(
        `Write the questions to another folder than ${path.dirname(besideInput)}: Asker reads every .xml file next to an input, and would take the Moodle XML for an input on its next run. A subfolder (such as ${path.join(path.dirname(besideInput), "questions")}) is fine.`,
      );
  }
  const existing = planned.filter((file) => existsSync(file));
  if (existing.length && !options.overwrite) throw new Error(`These files are there already: ${existing.join(", ")}. Choose another folder, or overwrite them with the person's yes (overwrite: true).`);
  mkdirSync(options.outputDir, { recursive: true });
  const exclude = [...(options.exclude ?? []), ...(options.ddmatch ? [] : ["ddmatch"])];
  const results: Generated[] = [];
  for (const input of expandInputs(options.inputs)) {
    results.push(
      await inWorkFolder({ doc: formats.includes("doc"), ...(options.stages ? { stages: options.stages } : {}), ...(options.category ? { category: options.category } : {}), penalties: options.penalties ?? true, exclude }, async (folder, output) =>
        generateOne(input, folder, output, { ...options, formats }),
      ),
    );
  }
  return results;
}

async function generateOne(input: string, folder: string, output: string, options: GenerateOptions & { formats: Format[] }): Promise<Generated> {
  const name = base(input);
  const foreign = foreignNeighbours(input);
  const hints = lintInput(input);
  if (foreign.length || blocking(hints))
    return { input, ok: false, files: {}, excludedByAsker: 0, errors: foreign.length ? [foreignNeighboursError(foreign)] : [], warnings: [], notes: ["Nothing was written; check_input says more."], hints, explained: [] };
  const run = await runAsker([input], { cwd: folder, timeoutMs: 600_000 });
  const said = `${run.stdout}\n${run.stderr}`;
  const parsed = parseRun(said);
  const errors = parsed.errors.map((e) => attribute(e, input));
  const xmlFile = path.join(output, outputName.moodle(name));
  const result: Generated = { input, ok: false, files: {}, excludedByAsker: parsed.excluded, errors, warnings: parsed.warnings, notes: [] };
  if (run.code !== 0 || !existsSync(xmlFile)) {
    if (!errors.length) errors.push(firstLine(run) || `Asker stopped (exit code ${run.code})`);
    result.notes.push("Nothing was written; check_input says more.");
    return { ...result, hints, explained: explain(errors) };
  }

  // Moodle XML: drag-and-drop matching left out unless asked for (Asker's exclude doesn't reach a
  // problem's), and the category, which Asker writes only in GIFT.
  const repair = repairAskerXml(readFileSync(xmlFile, "utf8"));
  let xml = repair.text;
  if (repair.repaired) result.notes.push(`Asker left ${repair.repaired} answer${repair.repaired === 1 ? "" : "s"} with < > or & unescaped, which made the Moodle XML unreadable: escaped, with the same text.`);
  if (repair.ordering) result.notes.push(`Asker's ${repair.ordering} ordering question${repair.ordering === 1 ? " lacked" : "s lacked"} the setting without which Moodle fails to import them ("Error writing to database"): added (shownumcorrect).`);
  let asker: Question[];
  try {
    asker = readMoodleXml(xml).questions;
  } catch (error) {
    return { ...result, errors: [...errors, `Asker's Moodle XML can't be read, nor imported: ${error instanceof Error ? error.message : String(error)}`], notes: ["Nothing was written."] };
  }
  if (!options.ddmatch) {
    const removal = removeFromMoodleXml(xml, { types: ["ddmatch"] });
    if (removal.removed.length) {
      xml = removal.text;
      result.notes.push(`${removal.removed.length} drag-and-drop matching (ddmatch) question${removal.removed.length === 1 ? " was" : "s were"} left out: ask for them with ddmatch: true.`);
    }
  }
  if (options.category) xml = setMoodleXmlCategory(xml, options.category);
  const { questions } = readMoodleXml(xml);
  const { all, groups } = countQuestions(questions);
  result.counts = all;
  result.groups = groups;
  if (!all.total) result.notes.push("Asker made no questions with these options: the input has nothing for the question types asked (stages), or exclude left everything out.");
  result.notes.push(...typeNotes(all));

  if (options.formats.includes("moodle")) {
    const target = path.join(options.outputDir, outputName.moodle(name));
    writeFileSync(target, xml);
    result.files.moodle = target;
  }
  if (options.formats.includes("gift")) {
    const source = path.join(output, outputName.gift(name));
    if (existsSync(source)) {
      // Asker's GIFT can't hold ddmatch questions, and breaks the question after each one: repaired
      // (see repairAskerGift), and anything still missing from it said.
      const gift = readFileSync(source, "utf8");
      const ddmatchNames = asker.filter((q) => q.type === "ddmatch").map((q) => q.name);
      const cleaned = gift.includes(GIFT_DDMATCH_WARNING) || ddmatchNames.length ? repairAskerGift(gift, ddmatchNames).text : gift;
      const inGift = new Set(giftNames(cleaned));
      const missing = questions.filter((q) => q.type !== "ddmatch" && !inGift.has(q.name));
      const withFiles = missing.filter((q) => q.files?.length).map((q) => q.name);
      const lost = missing.filter((q) => !q.files?.length).map((q) => q.name);
      const some = (names: string[]) => `${names.length} question${names.length === 1 ? "" : "s"} (${names.slice(0, 5).join(", ")}${names.length > 5 ? "…" : ""})`;
      const target = path.join(options.outputDir, outputName.gift(name));
      writeFileSync(target, cleaned);
      result.files.gift = target;
      if (options.ddmatch && ddmatchNames.length) result.notes.push(`The GIFT file has no drag-and-drop matching questions: GIFT can't hold them; the Moodle XML has them.`);
      if (withFiles.length) result.notes.push(`The GIFT file leaves out ${some(withFiles)} with an image, audio or video in them: GIFT can't carry files, so Asker skips them; the Moodle XML has them.`);
      if (lost.length) result.notes.push(`The GIFT file is missing ${some(lost)} the Moodle XML has: import the Moodle XML.`);
    } else result.notes.push("Asker wrote no GIFT file.");
  }
  if (options.formats.includes("doc")) {
    const source = path.join(output, outputName.doc(name));
    if (existsSync(source)) {
      const target = path.join(options.outputDir, outputName.doc(name));
      copyFileSync(source, target);
      result.files.doc = target;
    }
  }
  result.ok = true;
  return result;
}
