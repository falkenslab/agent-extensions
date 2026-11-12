// A content type's fields as an agent fills them: the content's shape, with what each field takes. The
// texts every package carries (buttons, messages: the semantics' common fields) are left out, since
// build_h5p fills them in the package's language; so are media, not supported yet.
import { partsOf, selectOptions } from "./content.js";
import { allowedTags, textOf } from "./html.js";
import type { Field } from "./libraries.js";

export interface FieldInfo {
  name: string;
  label?: string;
  description?: string;
  type: string;
  required: boolean;
  html?: boolean;
  allowedTags?: string[];
  default?: unknown;
  options?: unknown[];
  min?: number;
  max?: number;
  maxLength?: number;
  example?: string;
  types?: string[];
  fields?: FieldInfo[];
  item?: FieldInfo;
}

const MEDIA = ["image", "video", "audio", "file"];

export function describeFields(fields: Field[]): FieldInfo[] {
  return fields.filter(shown).map((f) => describe(f, true));
}

// A library field with no content type here holds media (H5P.Image, H5P.Video…): it and its group are left out.
const media = (field: Field): boolean => MEDIA.includes(field.type) || (field.type === "library" && !partsOf(field).length);
const shown = (field: Field) => !field.common && !field.deprecated && !media(field) && !(field.type === "group" && field.fields?.some(media) && !field.fields.some((f) => f.type === "text"));

function describe(field: Field, flatten = false): FieldInfo {
  const children = (field.fields ?? []).filter(shown);
  // A group with one field holds that field's value directly (see content.ts).
  if (flatten && field.type === "group" && field.fields?.length === 1 && children[0] && !field.isSubContent) {
    return { ...describe(children[0], true), name: field.name, ...(field.label ? { label: field.label } : {}) };
  }
  const description = [field.description, field.important?.description].map((d) => (d ? textOf(d.replace(/<\/li>/g, " ")) : "")).filter(Boolean).join(" ");
  const info: FieldInfo = {
    name: field.name,
    ...(field.label ? { label: field.label } : {}),
    ...(description ? { description: description.replace(/\s+/g, " ") } : {}),
    type: field.type,
    required: !field.optional && field.default === undefined && field.type !== "boolean" && field.type !== "group",
  };
  if (field.type === "text" && field.tags) Object.assign(info, { html: true, allowedTags: allowedTags(field) });
  if (field.default !== undefined && field.default !== null && field.default !== "") info.default = field.default;
  if (field.type === "select") info.options = selectOptions(field);
  if (field.min !== undefined) info.min = field.min;
  if (field.max !== undefined) info.max = field.max;
  if (field.maxLength !== undefined) info.maxLength = field.maxLength;
  const example = field.important?.example ?? field.placeholder;
  if (example) info.example = example;
  if (field.type === "library") info.types = partsOf(field);
  if (field.type === "group") info.fields = children.map((c) => describe(c, true));
  if (field.type === "list" && field.field) info.item = describe(field.field, true);
  return info;
}
