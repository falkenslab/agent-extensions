// Bundles src/server.ts and every dependency into one file, dist/server.mjs (ADR-001): agent-kit runs
// it with `npx -y <package>@<version>` and never `npm install`. Until the package is on npm, the video
// extension runs a copy of it, extensions/video/dist/server.mjs, which this build refreshes and which is
// committed (CI fails if it's stale). `--watch` rebuilds on change, without the copy.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/server.ts"],
  outfile: "dist/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // No source map: the copy in the extension would point at a file it doesn't have.
  sourcemap: false,
  // CommonJS dependencies bundled into ESM call `require` for Node built-ins.
  banner: {
    js: ["#!/usr/bin/env node", 'import { createRequire as __createRequire } from "node:module";', "const require = __createRequire(import.meta.url);"].join("\n"),
  },
  logLevel: "info",
};

if (watch) await (await esbuild.context(options)).watch();
else {
  await esbuild.build(options);
  const extension = fileURLToPath(new URL("../../../extensions/video/dist/", import.meta.url));
  mkdirSync(extension, { recursive: true });
  copyFileSync(fileURLToPath(new URL("../dist/server.mjs", import.meta.url)), `${extension}server.mjs`);
  console.log("copied to extensions/video/dist/server.mjs");
}
