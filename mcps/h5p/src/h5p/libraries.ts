// The pinned libraries' data (ADR-005), written by scripts/fetch-libraries.mjs from H5P's hub: each one's
// semantics.json and its translated defaults. A new version is a deliberate update: rerun the script.
import advancedText from "./libraries/H5P.AdvancedText-1.1.json" with { type: "json" };
import blanks from "./libraries/H5P.Blanks-1.14.json" with { type: "json" };
import coursePresentation from "./libraries/H5P.CoursePresentation-1.27.json" with { type: "json" };
import dialogcards from "./libraries/H5P.Dialogcards-1.9.json" with { type: "json" };
import dragText from "./libraries/H5P.DragText-1.10.json" with { type: "json" };
import flashcards from "./libraries/H5P.Flashcards-1.7.json" with { type: "json" };
import multiChoice from "./libraries/H5P.MultiChoice-1.16.json" with { type: "json" };
import questionSet from "./libraries/H5P.QuestionSet-1.21.json" with { type: "json" };
import trueFalse from "./libraries/H5P.TrueFalse-1.8.json" with { type: "json" };

/** A field of a library's semantics.json, with the keys this server reads. */
export interface Field {
  name: string;
  type: string;
  label?: string;
  description?: string;
  default?: unknown;
  optional?: boolean;
  common?: boolean;
  deprecated?: boolean;
  widget?: string;
  fields?: Field[];
  field?: Field;
  options?: unknown[];
  tags?: string[];
  font?: Record<string, unknown>;
  enterMode?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  step?: number;
  decimals?: number;
  regexp?: { pattern: string; modifiers?: string };
  isSubContent?: boolean;
  important?: { description?: string; example?: string };
  placeholder?: string;
}

/** A translation's defaults, positioned like the semantics they translate. */
export interface Translation {
  default?: unknown;
  fields?: Translation[];
  field?: Translation;
}

export interface Library {
  machineName: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  title: string;
  semantics: Field[];
  translations: Record<string, Translation[]>;
}

export const LIBRARIES = [multiChoice, trueFalse, blanks, dragText, dialogcards, flashcards, questionSet, coursePresentation, advancedText] as Library[];

/** `H5P.MultiChoice 1.16`, as h5p.json and a library field name a library. */
export const libraryName = (library: Library) => `${library.machineName} ${library.majorVersion}.${library.minorVersion}`;

/** The pinned library for `H5P.MultiChoice` or `H5P.MultiChoice 1.16` (only the pinned version). */
export function findLibrary(name: string): Library | undefined {
  const [machineName, version] = name.trim().split(/\s+/);
  const library = LIBRARIES.find((l) => l.machineName === machineName);
  return library && (!version || version === `${library.majorVersion}.${library.minorVersion}`) ? library : undefined;
}

/**
 * The semantics with their defaults in a language: `es-ES` falls back to `es`; English (the semantics'
 * own defaults) when the library has no translation for it, and `translated` says whether its texts are
 * in that language (a library with no texts to translate always is).
 */
export function localizedSemantics(library: Library, language: string): { semantics: Field[]; translated: boolean } {
  const code = language.toLowerCase();
  const translation = library.translations[code] ?? library.translations[code.split("-")[0] ?? code];
  if (!translation) return { semantics: library.semantics, translated: code === "en" || code.startsWith("en-") || !Object.keys(library.translations).length };
  return { semantics: library.semantics.map((f, i) => localize(f, translation[i])), translated: true };
}

function localize(field: Field, translation: Translation | undefined): Field {
  if (!translation) return field;
  return {
    ...field,
    ...(translation.default !== undefined ? { default: translation.default } : {}),
    ...(field.fields ? { fields: field.fields.map((f, i) => localize(f, translation.fields?.[i])) } : {}),
    ...(field.field ? { field: localize(field.field, translation.field) } : {}),
  };
}
