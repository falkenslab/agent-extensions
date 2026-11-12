// Bundles src/server.mjs into one dist/server.mjs that runs with no node_modules (agent-kit installs files and
// never runs npm install). sql.js's CommonJS code requires Node's built-ins (fs, path, crypto): in an ES module
// bundle, `require` comes from createRequire.
import { build } from "esbuild";

await build({
  entryPoints: ["src/server.mjs"],
  outfile: "dist/server.mjs",
  bundle: true,
  minify: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: { js: "import { createRequire } from \"node:module\"; const require = createRequire(import.meta.url);" },
});
