// Building a package: the content checked for its type, then the .h5p and its preview written next to
// each other. Nothing is written when the content has a problem or a file is there already.
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkContent } from "./content.js";
import { CONTENT_TYPES, findContentType, libraryOf } from "./contentTypes.js";
import { libraryName } from "./libraries.js";
import { packageFiles, writePackage } from "./package.js";
import { previewHtml } from "./preview.js";

export interface BuildInput {
  type: string;
  title: string;
  language: string;
  content: unknown;
  destDir: string;
  name?: string;
  overwrite?: boolean;
  preview?: boolean;
}

export interface BuildResult {
  path: string;
  preview?: string;
  type: string;
  version: string;
  title: string;
  language: string;
  warnings: string[];
}

/** A file name from a title: `Repaso: el átomo` → `repaso-el-atomo`. */
export const slug = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "h5p";

export async function buildPackage(input: BuildInput): Promise<BuildResult> {
  const type = findContentType(input.type);
  if (!type || type.partOnly) {
    const types = CONTENT_TYPES.filter((t) => !t.partOnly).map((t) => t.machineName);
    throw new Error(`${input.type} isn't a content type this server builds: use one of ${types.join(", ")} (list_h5p_types describes them).`);
  }
  const language = input.language.trim().toLowerCase();
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(language)) throw new Error(`"${input.language}" isn't a language code: use one such as "es", "en" or "pt-br".`);
  const title = input.title.trim();
  if (!title) throw new Error("The package needs a title.");
  const name = input.name?.trim().replace(/\.h5p$/i, "") || slug(title);
  if (/[\\/:*?"<>|]/.test(name) || name.startsWith(".")) throw new Error(`"${input.name}" isn't a file name: give the name alone, without folders.`);

  const library = libraryOf(type);
  const checked = checkContent(library, input.content, language);
  if (checked.problems.length) {
    throw new Error(`The content isn't valid for ${libraryName(library)}; fix these and call build_h5p again:\n${checked.problems.map((p) => `- ${p}`).join("\n")}`);
  }

  const destDir = path.resolve(input.destDir);
  const dir = await stat(destDir).catch(() => undefined);
  if (!dir?.isDirectory()) throw new Error(`The folder ${destDir} doesn't exist: give an existing folder in destDir.`);
  const file = path.join(destDir, `${name}.h5p`);
  const preview = input.preview === false ? undefined : path.join(destDir, `${name}.preview.html`);
  if (!input.overwrite) {
    for (const target of [file, preview]) {
      if (target && (await stat(target).catch(() => undefined))) throw new Error(`${target} already exists: choose another name, or pass overwrite: true once the person agrees to replace it.`);
    }
  }

  await writePackage(file, packageFiles(title, language, checked.libraries, checked.params));
  if (preview) await writeFile(preview, previewHtml(title, language, library.machineName, checked.params));
  return {
    path: file,
    ...(preview ? { preview } : {}),
    type: library.machineName,
    version: `${library.majorVersion}.${library.minorVersion}`,
    title,
    language,
    warnings: checked.warnings,
  };
}
