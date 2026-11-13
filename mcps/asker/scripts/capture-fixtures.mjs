// Runs the real Asker on test/fixtures/inputs/ and keeps what it says and writes in test/fixtures/runs/,
// for the tests with a fake asker. Asker chooses questions at random: run it again only when Asker
// changes, and commit the result.
//   npx tsx scripts/capture-fixtures.mjs
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { askerIni } from "../src/asker/config.ts";
import { rubyRunner } from "../src/asker/run.ts";

const inputs = path.resolve("test/fixtures/inputs");
const runs = path.resolve("test/fixtures/runs");
// This computer's paths stay out of the fixtures: Asker writes them with either slash.
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const root = new RegExp(
  process
    .cwd()
    .split(/[\\/]/)
    .map(escape)
    .join("[\\\\/]"),
  "gi",
);
const clean = (text) => text.replace(root, "<root>").replace(/\r\n/g, "\n");
rmSync(runs, { recursive: true, force: true });

const files = readdirSync(inputs, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(path.join(inputs, d.name)).filter((f) => /\.(haml|xml)$/.test(f)).map((f) => path.join(inputs, d.name, f)));

for (const file of files) {
  const name = path.basename(file, path.extname(file));
  const target = path.join(runs, name);
  mkdirSync(target, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), "asker-capture-"));
  const output = path.join(work, "output");
  // Every format and type, nothing excluded: the server's own filters are what the tests check.
  writeFileSync(path.join(work, "asker.ini"), askerIni({ outputFolder: output, doc: true, exclude: [] }));
  const relative = path.relative(process.cwd(), file).split(path.sep).join("/");
  if (file.endsWith(".haml")) {
    const check = await rubyRunner(["check", file], { cwd: work });
    writeFileSync(path.join(target, "check.json"), JSON.stringify({ input: relative, ...check, stdout: clean(check.stdout), stderr: clean(check.stderr) }, null, 2) + "\n");
  }
  const run = await rubyRunner([file], { cwd: work });
  writeFileSync(path.join(target, "run.json"), JSON.stringify({ input: relative, ...run, stdout: clean(run.stdout), stderr: clean(run.stderr) }, null, 2) + "\n");
  const written = existsSync(output) ? readdirSync(output).filter((out) => !out.endsWith(".log")) : [];
  for (const out of written) writeFileSync(path.join(target, out), clean(readFileSync(path.join(output, out), "utf8")));
  rmSync(work, { recursive: true, force: true });
  console.log(`${relative}: exit ${run.code}, ${written.join(", ") || "no output"}`);
}
