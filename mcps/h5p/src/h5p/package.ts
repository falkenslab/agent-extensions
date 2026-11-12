// The .h5p file: a zip with h5p.json and content/content.json. Written content-only (ADR-005); read
// whatever it holds, a package with its libraries too.
import { readFile, writeFile } from "node:fs/promises";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { Library } from "./libraries.js";

export interface PackageInfo {
  title: string;
  language: string;
  mainLibrary: string;
  /** The main library's version in the package, `1.16`, when h5p.json says. */
  version?: string;
  content: unknown;
  /** Libraries the package brings with it (`H5P.MultiChoice-1.16`). */
  libraries: string[];
  /** Files under content/ besides content.json (images, audio…). */
  media: string[];
}

export function packageFiles(title: string, language: string, libraries: Library[], params: Record<string, unknown>): Record<string, Uint8Array> {
  const [main] = libraries;
  if (!main) throw new Error("A package needs its main library");
  const h5p = {
    title,
    language,
    mainLibrary: main.machineName,
    embedTypes: ["iframe"],
    license: "U",
    preloadedDependencies: libraries.map((l) => ({ machineName: l.machineName, majorVersion: l.majorVersion, minorVersion: l.minorVersion })),
  };
  return { "h5p.json": strToU8(JSON.stringify(h5p, null, 2)), "content/content.json": strToU8(JSON.stringify(params)) };
}

export async function writePackage(file: string, files: Record<string, Uint8Array>): Promise<void> {
  await writeFile(file, zipSync(files, { level: 9 }));
}

export async function readPackage(file: string): Promise<PackageInfo> {
  const data = new Uint8Array(await readFile(file));
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new Error(`${file} isn't an .h5p package: it can't be read as a zip`);
  }
  const json = (name: string): Record<string, unknown> => {
    const data = files[name];
    if (!data) throw new Error(`${file} isn't an .h5p package: it has no ${name}`);
    try {
      return JSON.parse(strFromU8(data)) as Record<string, unknown>;
    } catch {
      throw new Error(`${file} isn't a valid .h5p package: its ${name} isn't valid JSON`);
    }
  };
  const h5p = json("h5p.json");
  const content = json("content/content.json");
  const mainLibrary = String(h5p.mainLibrary ?? "");
  const main = (Array.isArray(h5p.preloadedDependencies) ? (h5p.preloadedDependencies as Record<string, unknown>[]) : []).find((d) => d.machineName === mainLibrary);
  const names = Object.keys(files);
  return {
    title: String(h5p.title ?? ""),
    language: String(h5p.language ?? "und"),
    mainLibrary,
    ...(main ? { version: `${String(main.majorVersion)}.${String(main.minorVersion)}` } : {}),
    content,
    libraries: names.filter((n) => /^[^/]+\/library\.json$/.test(n)).map((n) => n.split("/")[0] ?? n).sort(),
    media: names.filter((n) => n.startsWith("content/") && n !== "content/content.json" && !n.endsWith("/")).sort(),
  };
}
