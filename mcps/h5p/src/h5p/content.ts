// A content checked against its library's semantics, the way H5P's content validator walks it
// (validateGroup, validateList, validateLibrary… in h5p-php-library), and filled with the defaults in the
// package's language. What the validator would quietly drop or change is a problem here, with its path.
import { randomUUID } from "node:crypto";
import { findContentType } from "./contentTypes.js";
import { checkHtml, escapeText, hasTags } from "./html.js";
import { findLibrary, libraryName, localizedSemantics, type Field, type Library } from "./libraries.js";
import { RULES } from "./rules.js";

export interface Checked {
  params: Record<string, unknown>;
  problems: string[];
  warnings: string[];
  /** Every library the content uses, the main one first: the package's dependencies. */
  libraries: Library[];
}

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const MEDIA = ["image", "video", "audio", "file"];

class Checker {
  readonly problems: string[] = [];
  readonly warnings = new Set<string>();
  readonly libraries: Library[] = [];

  constructor(private readonly language: string) {}

  params(library: Library, value: unknown, path: string): Record<string, unknown> {
    if (!this.libraries.includes(library)) this.libraries.push(library);
    const { semantics, translated } = localizedSemantics(library, this.language);
    if (!translated) this.warnings.add(`${library.machineName} has no translation for "${this.language}": its buttons and messages stay in English.`);
    const params = this.group({ name: "", type: "group", fields: semantics }, value ?? {}, path, false) ?? {};
    for (const problem of RULES[library.machineName]?.(params) ?? []) this.problems.push(at(path, problem.path, problem.problem));
    return params;
  }

  private problem(path: string, problem: string) {
    this.problems.push(at(path, "", problem));
  }

  private value(field: Field, value: unknown, path: string): unknown {
    if (MEDIA.includes(field.type)) {
      if (value !== undefined) this.problem(path, "images and other media aren't supported yet: leave this field out");
      return undefined;
    }
    if (value === undefined || value === null) return this.missing(field, path);
    switch (field.type) {
      case "text":
        return this.text(field, value, path);
      case "number":
        return this.number(field, value, path);
      case "boolean":
        if (typeof value !== "boolean") this.problem(path, "must be true or false");
        return value;
      case "select":
        return this.select(field, value, path);
      case "list":
        return this.list(field, value, path);
      case "group":
        return this.group(field, value, path, true);
      case "library":
        return this.library(field, value, path);
      default:
        this.problem(path, `fields of type ${field.type} aren't supported`);
        return undefined;
    }
  }

  /** A field left out: its default (as if given, so it's kept as the rest), or a problem when it's required and has none. */
  private missing(field: Field, path: string): unknown {
    if (field.default !== undefined && field.default !== null) return this.value(field, structuredClone(field.default), path);
    if (field.type === "group") return this.group(field, undefined, path, true);
    if (field.type === "boolean") return field.optional ? undefined : false;
    if (field.optional) return undefined;
    if (field.type !== "list") this.problem(path, "is required");
    else if (field.min) this.problem(path, `needs at least ${field.min} item${field.min === 1 ? "" : "s"}`);
    return undefined;
  }

  private text(field: Field, value: unknown, path: string): string | undefined {
    if (typeof value !== "string") {
      this.problem(path, "must be text");
      return undefined;
    }
    let text = value;
    if (field.tags) {
      if (field.widget === "html" && text.trim() && !hasTags(text)) text = `<${field.enterMode === "p" ? "p" : "div"}>${escapeText(text)}</${field.enterMode === "p" ? "p" : "div"}>`;
      const checked = checkHtml(text, field);
      for (const problem of checked.problems) this.problem(path, problem);
      text = checked.html;
    } else text = escapeText(text);
    if (!text.trim() && !field.optional && field.default === undefined) this.problem(path, "is required");
    if (field.maxLength !== undefined && text.length > field.maxLength) this.problem(path, `is longer than ${field.maxLength} characters`);
    if (field.regexp && !(text === "" && field.optional)) {
      if (!new RegExp(field.regexp.pattern, (field.regexp.modifiers ?? "").replace(/[^gimsuy]/g, "")).test(text)) this.problem(path, `doesn't match the pattern ${field.regexp.pattern}`);
    }
    return text;
  }

  private number(field: Field, value: unknown, path: string): unknown {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.problem(path, "must be a number");
      return value;
    }
    if (field.min !== undefined && value < field.min) this.problem(path, `must be at least ${field.min}`);
    if (field.max !== undefined && value > field.max) this.problem(path, `must be at most ${field.max}`);
    if (field.step !== undefined && (value - (field.min ?? 0)) % field.step !== 0) this.problem(path, `must go in steps of ${field.step}`);
    if (field.decimals !== undefined && Number(value.toFixed(field.decimals)) !== value) this.problem(path, `can have at most ${field.decimals} decimals`);
    return value;
  }

  private select(field: Field, value: unknown, path: string): unknown {
    const options = selectOptions(field);
    if (options.length && !options.includes(value as string)) this.problem(path, `must be one of ${options.map((o) => JSON.stringify(o)).join(", ")}`);
    return value;
  }

  private list(field: Field, value: unknown, path: string): unknown[] | undefined {
    if (!Array.isArray(value)) {
      this.problem(path, "must be a list");
      return undefined;
    }
    if (field.min !== undefined && value.length < field.min && (value.length || !field.optional)) this.problem(path, `needs at least ${field.min} item${field.min === 1 ? "" : "s"}`);
    if (field.max !== undefined && value.length > field.max) this.problem(path, `can have at most ${field.max} items`);
    const items = value.map((item, i) => (field.field ? this.value(field.field, item, `${path}[${i}]`) : item)).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }

  private group(field: Field, value: unknown, path: string, flatten: boolean): Record<string, unknown> | undefined {
    const fields = field.fields ?? [];
    // A group with one field holds that field's value directly, as H5P's editor saves it.
    if (flatten && fields.length === 1 && !field.isSubContent && fields[0]) return this.value(fields[0], value, path) as Record<string, unknown> | undefined;
    value ??= {};
    if (typeof value !== "object" || Array.isArray(value)) {
      this.problem(path, "must be an object with fields");
      return undefined;
    }
    const given = value as Record<string, unknown>;
    for (const key of Object.keys(given)) {
      if (!fields.some((f) => f.name === key) && !(field.isSubContent && key === "subContentId")) this.problem(join(path, key), "isn't a field here");
    }
    const out: Record<string, unknown> = {};
    for (const child of fields) {
      const result = this.value(field.optional ? { ...child, optional: true } : child, given[child.name], join(path, child.name));
      if (result !== undefined) out[child.name] = result;
    }
    return Object.keys(out).length || !field.optional ? out : undefined;
  }

  private library(field: Field, value: unknown, path: string): unknown {
    if (typeof value !== "object" || value === null || typeof (value as { library?: unknown }).library !== "string") {
      this.problem(path, "must be { library, params }");
      return undefined;
    }
    const given = value as { library: string; params?: unknown; subContentId?: unknown; metadata?: { title?: unknown } };
    const allowed = partsOf(field);
    if (!allowed.length) {
      this.problem(path, "images and other media aren't supported yet: leave this field out");
      return undefined;
    }
    const library = findLibrary(given.library);
    if (!library || !allowed.includes(library.machineName)) {
      this.problem(join(path, "library"), `must be one of ${allowed.join(", ")}`);
      return undefined;
    }
    for (const key of Object.keys(given)) if (!["library", "params", "subContentId", "metadata"].includes(key)) this.problem(join(path, key), "isn't a field here");
    const params = this.params(library, given.params, join(path, "params"));
    const title = typeof given.metadata?.title === "string" && given.metadata.title.trim() ? given.metadata.title : library.title;
    return {
      library: libraryName(library),
      params,
      subContentId: typeof given.subContentId === "string" && UUID.test(given.subContentId) ? given.subContentId : randomUUID(),
      metadata: { contentType: library.title, license: "U", title },
    };
  }
}

/** The content types a library field takes here: its options this server keeps semantics for. */
export function partsOf(field: Field): string[] {
  const options = (field.options ?? []).map((o) => String(typeof o === "object" && o !== null ? (o as { name?: unknown }).name : o).split(" ")[0] ?? "");
  return options.filter((name) => findContentType(name) && findLibrary(name));
}

export function selectOptions(field: Field): unknown[] {
  return (field.options ?? []).flatMap((o) => {
    const option = o as { type?: string; value?: unknown; options?: { value?: unknown }[] };
    return option.type === "optgroup" ? (option.options ?? []).map((s) => s.value) : [option.value];
  });
}

const join = (path: string, key: string) => (path && key ? `${path}.${key}` : path || key);
const at = (path: string, sub: string, problem: string) => `${join(path, sub) || "content"}: ${problem}`;

/** Checks a content for a library in a language, and returns it as the site will keep it. */
export function checkContent(library: Library, content: unknown, language: string): Checked {
  const checker = new Checker(language);
  if (typeof content !== "object" || content === null || Array.isArray(content)) return { params: {}, problems: ["content: must be an object with the type's fields"], warnings: [], libraries: [library] };
  const params = checker.params(library, content, "");
  return { params, problems: checker.problems, warnings: [...checker.warnings], libraries: checker.libraries };
}
