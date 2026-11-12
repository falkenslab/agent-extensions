import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { buildPackage, slug } from "../../src/h5p/build.js";
import { checkContent } from "../../src/h5p/content.js";
import { CONTENT_TYPES } from "../../src/h5p/contentTypes.js";
import { findLibrary, type Library } from "../../src/h5p/libraries.js";
import { readPackage } from "../../src/h5p/package.js";

const fixture = (name: string) => JSON.parse(readFileSync(`test/fixtures/content/${name}.json`, "utf8")) as Record<string, unknown>;
const types = CONTENT_TYPES.filter((t) => !t.partOnly).map((t) => t.machineName);

describe("buildPackage", () => {
  for (const type of types) {
    it(`builds ${type} and reads back what went in`, async () => {
      const dir = mkdtempSync(path.join(tmpdir(), "h5p-"));
      const result = await buildPackage({ type, title: `Prueba de ${type}`, language: "es", content: fixture(type), destDir: dir });
      assert.deepEqual(result.warnings, []);
      const pkg = await readPackage(result.path);
      assert.equal(pkg.mainLibrary, type);
      assert.equal(pkg.version, result.version);
      assert.equal(pkg.language, "es");
      assert.deepEqual(pkg.libraries, []);
      // Read back, it builds again into the same content.
      const again = checkContent(findLibrary(type) as Library, pkg.content, "es");
      assert.deepEqual(again.problems, []);
      assert.deepEqual(again.params, pkg.content);
      assert.match(readFileSync(result.preview ?? "", "utf8"), /<!doctype html>/);
    });
  }

  it("refuses an unknown type, a part on its own and a bad language", async () => {
    const base = { title: "t", content: {}, destDir: tmpdir() };
    await assert.rejects(buildPackage({ ...base, type: "H5P.Essay", language: "es" }), /isn't a content type this server builds/);
    await assert.rejects(buildPackage({ ...base, type: "H5P.AdvancedText", language: "es" }), /isn't a content type this server builds/);
    await assert.rejects(buildPackage({ ...base, type: "H5P.TrueFalse", language: "spanish!" }), /isn't a language code/);
  });

  it("refuses wrong content and writes nothing", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "h5p-"));
    await assert.rejects(buildPackage({ type: "H5P.Blanks", title: "Huecos", language: "es", content: { questions: ["Sin hueco."] }, destDir: dir }), /questions\[0\]: has no blank/);
    await assert.rejects(readPackage(path.join(dir, "huecos.h5p")), /ENOENT/);
  });

  it("refuses to overwrite unless asked", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "h5p-"));
    writeFileSync(path.join(dir, "vf.h5p"), "");
    const input = { type: "H5P.TrueFalse", title: "VF", language: "es", content: fixture("H5P.TrueFalse"), destDir: dir, name: "vf" };
    await assert.rejects(buildPackage(input), /already exists/);
    assert.equal((await buildPackage({ ...input, overwrite: true })).path, path.join(dir, "vf.h5p"));
  });

  it("names the file after the title", () => {
    assert.equal(slug("Repaso: el átomo (2.º ESO)"), "repaso-el-atomo-2-eso");
  });
});
