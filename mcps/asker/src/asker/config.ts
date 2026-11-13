// The asker.ini the server writes in the folder it runs Asker from: Asker reads it from there, else its
// own, whose default looks up images on the internet. So every run has internet off, no colours, and
// both Moodle XML (the complete output, which read_questions reads) and GIFT (whose headers name each
// question's concept, problem or code file).

/** Asker's question types for concepts, by the letter it uses (its `stages`). */
export const STAGES = {
  definitions: "d",
  "table-matching": "b",
  "one-field-tables": "f",
  files: "i",
  sequences: "s",
  "table-rows": "t",
} as const;

export type Stage = keyof typeof STAGES;
export const STAGE_NAMES = Object.keys(STAGES) as [Stage, ...Stage[]];

/** The languages Asker writes its questions in: an input's %map says which. */
export const LANGUAGES = ["en", "es", "fr", "ca", "du"] as const;

export interface AskerOptions {
  /** Where Asker writes its outputs: an absolute folder. */
  outputFolder: string;
  /** Write the review sheet (`<name>.txt`). */
  doc?: boolean;
  /** Which question types for concepts; all when not given. */
  stages?: Stage[];
  /** The question bank category, as Moodle's path: "Unit 3/Bands". */
  category?: string;
  /** Penalties for wrong multiple-choice answers (Asker's fractions): on by default. */
  penalties?: boolean;
  /** Leave out questions whose name contains any of these texts (Asker's exclude). */
  exclude?: string[];
}

/** Asker's default penalties for 2 to 10 options, as its own asker.ini has them. */
const FRACTIONS = ",-50,-33.33333,-25,-20,-16.66667,-14.28571,-12.5,-11.11111,-10";
const NO_FRACTIONS = "0,0,0,0,0,0,0,0,0,0";

/** Why a text can't go into asker.ini as a quoted value, or undefined when it can. */
export function iniProblem(text: string): string | undefined {
  if (/["\r\n]/.test(text)) return "it can't contain double quotes or line breaks";
  return undefined;
}

const quote = (text: string) => `"${text}"`;

/** The asker.ini for these options. */
export function askerIni(options: AskerOptions): string {
  const stages = (options.stages?.length ? options.stages : STAGE_NAMES).map((s) => STAGES[s]).join(",");
  const values = [options.outputFolder, options.category ?? "", ...(options.exclude ?? [])];
  for (const value of values) {
    const problem = iniProblem(value);
    if (problem) throw new Error(`"${value}" can't be passed to Asker: ${problem}`);
  }
  if (options.exclude?.some((text) => text.includes(","))) throw new Error("A text to exclude can't contain a comma: Asker splits them on commas");
  return [
    "[global]",
    'version = ">= 2.6.0"',
    "internet = no",
    "verbose = yes",
    "color = no",
    'show_mode = "resume"',
    "",
    "[output]",
    `folder = ${quote(options.outputFolder)}`,
    "gift = yes",
    `doc = ${options.doc ? "yes" : "no"}`,
    "yaml = no",
    "moodle = yes",
    "",
    "[languages]",
    // Asker takes every question's language from the input's %map, which must say it.
    "default = en",
    ...["ca", "du", "en", "es", "fr", "javascript", "python", "ruby", "sql"].map((l) => `${l} = yes`),
    "math = no",
    "",
    "[ai]",
    'formula_weights = "1, 1, 1"',
    "",
    "[questions]",
    `fractions = ${quote(options.penalties === false ? NO_FRACTIONS : FRACTIONS)}`,
    `stages = ${quote(stages)}`,
    `category = ${quote(options.category ?? "")}`,
    `exclude = ${quote((options.exclude ?? []).join(", "))}`,
    "",
  ].join("\n");
}
