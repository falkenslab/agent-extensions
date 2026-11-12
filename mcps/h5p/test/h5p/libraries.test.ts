import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTENT_TYPES, libraryOf } from "../../src/h5p/contentTypes.js";
import { findLibrary, libraryName } from "../../src/h5p/libraries.js";

// The versions installed on the sites the packages are tried on (.minispec/features/h5p-packages.md).
const PINNED = ["H5P.MultiChoice 1.16", "H5P.TrueFalse 1.8", "H5P.Blanks 1.14", "H5P.DragText 1.10", "H5P.Dialogcards 1.9", "H5P.Flashcards 1.7", "H5P.QuestionSet 1.21", "H5P.CoursePresentation 1.27", "H5P.AdvancedText 1.1"];

describe("libraries", () => {
  it("keeps every content type's library at its pinned version", () => {
    assert.deepEqual(CONTENT_TYPES.map((t) => libraryName(libraryOf(t))), PINNED);
  });

  it("finds a library by machine name, or with its pinned version only", () => {
    assert.equal(findLibrary("H5P.Blanks")?.minorVersion, 14);
    assert.equal(findLibrary("H5P.Blanks 1.14")?.minorVersion, 14);
    assert.equal(findLibrary("H5P.Blanks 1.13"), undefined);
  });

  it("has the Spanish texts of every type with texts", () => {
    for (const type of CONTENT_TYPES.filter((t) => !t.partOnly)) assert.ok(libraryOf(type).translations.es, type.machineName);
  });
});
