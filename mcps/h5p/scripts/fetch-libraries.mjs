// Fetches the pinned content types from H5P's hub and keeps what the server needs as data, in
// src/h5p/libraries/<machineName>-<major>.<minor>.json: each library's semantics.json and, from its
// language/*.json, the translated defaults (the texts a package shows: buttons, messages). Run it by
// hand when a pinned version changes (ADR-005); the server itself never talks to h5p.org.
//   node scripts/fetch-libraries.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";

// The content types, as installed on the sites they're tried on, and the libraries they need data for.
const TYPES = ["H5P.MultiChoice", "H5P.TrueFalse", "H5P.Blanks", "H5P.DragText", "H5P.Dialogcards", "H5P.Flashcards", "H5P.QuestionSet", "H5P.CoursePresentation"];
const LIBRARIES = {
  "H5P.MultiChoice": "1.16",
  "H5P.TrueFalse": "1.8",
  "H5P.Blanks": "1.14",
  "H5P.DragText": "1.10",
  "H5P.Dialogcards": "1.9",
  "H5P.Flashcards": "1.7",
  "H5P.QuestionSet": "1.21",
  "H5P.CoursePresentation": "1.27",
  "H5P.AdvancedText": "1.1",
};
const OUT = "src/h5p/libraries";

/** A translation reduced to its defaults, the same shape as the semantics; undefined when it has none. */
function defaults(field) {
  if (Array.isArray(field)) {
    const items = field.map(defaults);
    return items.some((i) => i !== undefined) ? items.map((i) => i ?? {}) : undefined;
  }
  if (!field || typeof field !== "object") return undefined;
  const out = {};
  if (field.default !== undefined && field.default !== null && field.default !== "") out.default = field.default;
  const fields = defaults(field.fields);
  if (fields) out.fields = fields;
  const item = defaults(field.field);
  if (item) out.field = item;
  return Object.keys(out).length ? out : undefined;
}

const found = new Map();
for (const type of TYPES) {
  const response = await fetch(`https://hub-api.h5p.org/v1/content-types/${type}`);
  if (!response.ok) throw new Error(`${type}: the hub answered ${response.status}`);
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  for (const [name, version] of Object.entries(LIBRARIES)) {
    const dir = `${name}-${version}/`;
    if (found.has(name) || !files[`${dir}library.json`]) continue;
    const library = JSON.parse(strFromU8(files[`${dir}library.json`]));
    const translations = {};
    for (const file of Object.keys(files).filter((f) => f.startsWith(`${dir}language/`) && f.endsWith(".json")).sort()) {
      const language = path.basename(file, ".json");
      if (language === ".en") continue;
      const kept = defaults(JSON.parse(strFromU8(files[file])).semantics);
      if (kept) translations[language] = kept;
    }
    found.set(name, {
      machineName: name,
      majorVersion: library.majorVersion,
      minorVersion: library.minorVersion,
      patchVersion: library.patchVersion,
      title: library.title,
      semantics: JSON.parse(strFromU8(files[`${dir}semantics.json`])),
      translations,
    });
  }
}

mkdirSync(OUT, { recursive: true });
for (const [name, version] of Object.entries(LIBRARIES)) {
  const data = found.get(name);
  if (!data) throw new Error(`${name} ${version} isn't in the hub's packages: has the hub moved to another version?`);
  writeFileSync(path.join(OUT, `${name}-${version}.json`), JSON.stringify(data) + "\n");
  console.log(`${name} ${data.majorVersion}.${data.minorVersion}.${data.patchVersion}: ${Object.keys(data.translations).length} languages`);
}
