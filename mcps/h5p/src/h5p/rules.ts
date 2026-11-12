// What each content type needs beyond its semantics, which H5P's editor or player expect: a multiple
// choice with a right answer, a blank with an answer… Each rule reads the checked params.
import { textOf } from "./html.js";

export interface RuleProblem {
  path: string;
  problem: string;
}

type Rule = (params: Record<string, unknown>) => RuleProblem[];

const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value : []);
const str = (value: unknown) => (typeof value === "string" ? value : "");
/** The `*answer*` marks in a Blanks or Drag the Words text. */
const marks = (text: string) => [...text.matchAll(/\*([^*]*)\*/g)].map((m) => (m[1] ?? "").split(":")[0]?.trim() ?? "");

export const RULES: Record<string, Rule> = {
  "H5P.MultiChoice": (params) => {
    const answers = list(params.answers);
    const right = answers.filter((a) => a.correct === true).length;
    const problems: RuleProblem[] = [];
    if (answers.length < 2) problems.push({ path: "answers", problem: "needs at least two answers" });
    if (!right) problems.push({ path: "answers", problem: "needs at least one answer with correct: true" });
    if (right > 1 && (params.behaviour as { type?: string } | undefined)?.type === "single") problems.push({ path: "behaviour.type", problem: `is "single" but ${right} answers are correct: mark one, or use "auto"` });
    answers.forEach((a, i) => {
      if (!textOf(str(a.text))) problems.push({ path: `answers[${i}].text`, problem: "is empty" });
    });
    return problems;
  },
  "H5P.Blanks": (params) =>
    (Array.isArray(params.questions) ? (params.questions as unknown[]) : []).flatMap((question, i) => {
      const found = marks(str(question));
      if (!found.length) return [{ path: `questions[${i}]`, problem: "has no blank: put each answer between asterisks, *answer*" }];
      return found.some((m) => !m) ? [{ path: `questions[${i}]`, problem: "has a blank with no answer between its asterisks" }] : [];
    }),
  "H5P.DragText": (params) => {
    const found = marks(str(params.textField));
    if (!found.length) return [{ path: "textField", problem: "has no word to drag: put each one between asterisks, *word*" }];
    return found.some((m) => !m) ? [{ path: "textField", problem: "has asterisks with no word between them" }] : [];
  },
  "H5P.Dialogcards": (params) =>
    list(params.dialogs).flatMap((card, i) => [
      ...(textOf(str(card.text)) ? [] : [{ path: `dialogs[${i}].text`, problem: "is empty: the card's front needs text" }]),
      ...(textOf(str(card.answer)) ? [] : [{ path: `dialogs[${i}].answer`, problem: "is empty: the card's back needs text" }]),
    ]),
  "H5P.Flashcards": (params) =>
    list(params.cards).flatMap((card, i) => [
      ...(textOf(str(card.text)) ? [] : [{ path: `cards[${i}].text`, problem: "is empty: the card needs a question" }]),
      ...(textOf(str(card.answer)) ? [] : [{ path: `cards[${i}].answer`, problem: "is empty: the card needs its answer" }]),
    ]),
  "H5P.CoursePresentation": (params) => {
    const slides = list((params.presentation as { slides?: unknown } | undefined)?.slides);
    return slides.length ? [] : [{ path: "presentation.slides", problem: "needs at least one slide" }];
  },
};
