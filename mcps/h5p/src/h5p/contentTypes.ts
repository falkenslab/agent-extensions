// The content types this server builds, what each is for, and which content types can go inside the
// ones that hold others: only those whose semantics are kept here, so every part is checked.
import { findLibrary, type Library } from "./libraries.js";

export interface ContentType {
  machineName: string;
  /** What it's for, for an agent choosing one, with what its fields' descriptions don't say. */
  purpose: string;
  /** For a type that holds others: the content types its library fields take. */
  parts?: string[];
  /** A part only: it goes inside another type, never in a package of its own. */
  partOnly?: boolean;
}

const QUESTIONS = ["H5P.MultiChoice", "H5P.TrueFalse", "H5P.Blanks", "H5P.DragText"];

export const CONTENT_TYPES: ContentType[] = [
  { machineName: "H5P.MultiChoice", purpose: "A question with several answers, one or more of them right (at least two answers, at least one marked correct)." },
  { machineName: "H5P.TrueFalse", purpose: "A statement the student marks as true or false; correct is \"true\" or \"false\"." },
  {
    machineName: "H5P.Blanks",
    purpose: "Fill in the blanks: each question is a text where every answer goes between asterisks, *answer*; alternative right answers are separated by slashes, *colour/color*, and a tip follows a colon, *answer:tip*.",
  },
  { machineName: "H5P.DragText", purpose: "Drag the words: a text where each word or phrase the student drags into place goes between asterisks, *word*; distractors are extra words between asterisks too." },
  { machineName: "H5P.Dialogcards", purpose: "Cards with a prompt on the front and its answer on the back, which the student turns over to check themselves." },
  { machineName: "H5P.Flashcards", purpose: "Cards with a question the student answers by typing, then checks against the right answer." },
  {
    machineName: "H5P.QuestionSet",
    purpose: "A quiz: several questions of other types one after another, with a score at the end. Each question is { library, params }: the library is one of parts, and params its content, the fields list_h5p_types gives for that type.",
    parts: QUESTIONS,
  },
  {
    machineName: "H5P.CoursePresentation",
    purpose:
      "Slides with text and interactive questions. presentation.slides is a list of slides; each slide's elements are placed with x and y (their top-left corner) and width and height, all in percent of the slide, and hold an action { library, params }: the library is one of parts (H5P.AdvancedText for text), and params its content, the fields list_h5p_types gives for that type.",
    parts: ["H5P.AdvancedText", ...QUESTIONS, "H5P.Dialogcards"],
  },
  { machineName: "H5P.AdvancedText", purpose: "Formatted text, for a Course Presentation's slide.", partOnly: true },
];

export function findContentType(machineName: string): ContentType | undefined {
  return CONTENT_TYPES.find((t) => t.machineName === machineName.trim().split(/\s+/)[0]);
}

/** The library behind a content type: every content type here has one. */
export function libraryOf(type: ContentType): Library {
  const library = findLibrary(type.machineName);
  if (!library) throw new Error(`${type.machineName} has no library data: rerun scripts/fetch-libraries.mjs`);
  return library;
}
