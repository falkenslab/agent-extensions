import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { checkContent } from "../../src/h5p/content.js";
import { findLibrary, type Library } from "../../src/h5p/libraries.js";

const library = (name: string) => findLibrary(name) as Library;
const fixture = (name: string) => JSON.parse(readFileSync(`test/fixtures/content/${name}.json`, "utf8")) as Record<string, unknown>;

describe("checkContent", () => {
  it("accepts the content of the package tried on moodle-sandbox, unchanged", () => {
    const content = JSON.parse(readFileSync("test/fixtures/multichoice/content/content.json", "utf8")) as Record<string, unknown>;
    const { params, problems } = checkContent(library("H5P.MultiChoice"), content, "es");
    assert.deepEqual(problems, []);
    assert.deepEqual(params.answers, content.answers);
    assert.deepEqual(params.behaviour, content.behaviour);
  });

  it("fills buttons and messages in the package's language", () => {
    const { params, warnings } = checkContent(library("H5P.MultiChoice"), fixture("H5P.MultiChoice"), "es");
    assert.equal((params.UI as Record<string, string>).checkAnswerButton, "Comprobar");
    assert.deepEqual(warnings, []);
  });

  it("falls back from a regional code to its language, and to English with a warning", () => {
    assert.equal((checkContent(library("H5P.TrueFalse"), fixture("H5P.TrueFalse"), "es-es").params.l10n as Record<string, string>).trueText, "Verdadero");
    const { params, warnings } = checkContent(library("H5P.TrueFalse"), fixture("H5P.TrueFalse"), "xx");
    assert.equal((params.l10n as Record<string, string>).trueText, "True");
    assert.match(warnings[0] ?? "", /no translation for "xx"/);
  });

  it("wraps and escapes plain text where a field takes HTML, and escapes plain text fields", () => {
    const { params } = checkContent(library("H5P.MultiChoice"), { question: "Is 1 < 2?", answers: [{ text: "Yes", correct: true }, { text: "No", correct: false }] }, "en");
    assert.equal(params.question, "<p>Is 1 &lt; 2?</p>");
    assert.equal((params.answers as { text: string }[])[0]?.text, "<div>Yes</div>");
  });

  it("holds a group with one field as that field's value", () => {
    const { params, problems } = checkContent(library("H5P.MultiChoice"), { ...fixture("H5P.MultiChoice"), overallFeedback: [{ from: 0, to: 100, feedback: "Bien" }] }, "es");
    assert.deepEqual(problems, []);
    assert.deepEqual(params.overallFeedback, [{ from: 0, to: 100, feedback: "Bien" }]);
  });

  it("gives what's wrong with its path", () => {
    const { problems } = checkContent(library("H5P.MultiChoice"), { answers: [{ text: "a", correct: "yes" }], colour: "red" }, "en");
    assert.deepEqual(problems.sort(), [
      "answers: needs at least one answer with correct: true",
      "answers: needs at least two answers",
      "answers[0].correct: must be true or false",
      "colour: isn't a field here",
      "question: is required",
    ]);
  });

  it("checks the parts inside another type, and gives each its id and metadata", () => {
    const { params, problems, libraries } = checkContent(library("H5P.QuestionSet"), fixture("H5P.QuestionSet"), "es");
    assert.deepEqual(problems, []);
    assert.deepEqual(
      libraries.map((l) => l.machineName),
      ["H5P.QuestionSet", "H5P.MultiChoice", "H5P.TrueFalse", "H5P.Blanks"],
    );
    const [first] = params.questions as { library: string; subContentId: string; metadata: { contentType: string } }[];
    assert.equal(first?.library, "H5P.MultiChoice 1.16");
    assert.match(first?.subContentId ?? "", /^[a-f0-9-]{36}$/);
    assert.equal(first?.metadata.contentType, "Multiple Choice");
  });

  it("refuses a part the type doesn't take, and media", () => {
    const { problems } = checkContent(library("H5P.QuestionSet"), { questions: [{ library: "H5P.Essay 1.5", params: {} }] }, "en");
    assert.match(problems[0] ?? "", /^questions\[0\]\.library: must be one of H5P\.MultiChoice/);
    const media = checkContent(library("H5P.Dialogcards"), { dialogs: [{ text: "a", answer: "b", image: { path: "images/a.png" } }] }, "en");
    assert.deepEqual(media.problems, ["dialogs[0].image: images and other media aren't supported yet: leave this field out"]);
  });
});
