// Bundles src/server.ts and every dependency into one file, dist/server.mjs (ADR-001): agent-kit runs
// it with `npx -y <package>@<version>` and never `npm install`. `--watch` rebuilds on change.
// Until the package is on npm, the extension runs a copy of it: extensions/work-placements/dist/server.mjs,
// committed, which every build refreshes (CI fails when the committed copy is stale).
import { copyFileSync, mkdirSync } from "node:fs";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const extensionCopy = new URL("../../../extensions/work-placements/dist/", import.meta.url);

/** @type {import("esbuild").Plugin} */
const copyToExtension = {
  name: "copy-to-extension",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;
      mkdirSync(extensionCopy, { recursive: true });
      copyFileSync(new URL("../dist/server.mjs", import.meta.url), new URL("server.mjs", extensionCopy));
    });
  },
};

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/server.ts"],
  outfile: "dist/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // No source map: the extension's copy travels alone, without one.
  // CommonJS dependencies bundled into ESM call `require` for Node built-ins.
  banner: {
    js: ["#!/usr/bin/env node", 'import { createRequire as __createRequire } from "node:module";', "const require = __createRequire(import.meta.url);"].join("\n"),
  },
  plugins: [copyToExtension],
  logLevel: "info",
};

if (watch) await (await esbuild.context(options)).watch();
else await esbuild.build(options);
