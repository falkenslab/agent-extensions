// A package's content as a plain HTML page, to review it before uploading: the questions, the answers
// with the right ones marked, the cards, the slides. No H5P player: it shows what's there, not how it
// plays. It renders checked params only, whose texts are already escaped or limited to allowed tags.
import { escapeText } from "./html.js";

type Params = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown): Params[] => (Array.isArray(value) ? (value as Params[]) : []);
const group = (value: unknown): Params => (typeof value === "object" && value !== null ? (value as Params) : {});

/** `*answer/alternative:tip*` marks as highlighted answers, the tip in a tooltip. */
const marked = (text: string) =>
  text.replace(/\*([^*]+)\*/g, (_, mark: string) => {
    const [answer = "", tip] = mark.split(":");
    return `<mark${tip ? ` title="${escapeText(tip)}"` : ""}>${answer.split("/").join(" / ")}</mark>`;
  });

const RENDERERS: Record<string, (params: Params) => string> = {
  "H5P.MultiChoice": (p) =>
    `${str(p.question)}<ul class="answers">${list(p.answers)
      .map((a) => {
        const feedback = group(a.tipsAndFeedback);
        const notes = [feedback.tip, feedback.chosenFeedback].map(str).filter(Boolean);
        return `<li class="${a.correct ? "right" : "wrong"}"><span class="mark">${a.correct ? "✓" : "✗"}</span>${str(a.text)}${notes.map((n) => `<div class="note">${n}</div>`).join("")}</li>`;
      })
      .join("")}</ul>`,
  "H5P.TrueFalse": (p) => `${str(p.question)}<p class="answer">Answer: <strong>${str(group(p.l10n)[p.correct === "true" ? "trueText" : "falseText"]) || str(p.correct)}</strong></p>`,
  "H5P.Blanks": (p) => `${str(p.text)}<ol class="items">${list(p.questions).map((q) => `<li>${marked(str(q))}</li>`).join("")}</ol>`,
  "H5P.DragText": (p) =>
    `${str(p.taskDescription)}<p class="text">${marked(str(p.textField)).replace(/\n/g, "<br>")}</p>${str(p.distractors) ? `<p class="note">Distractors: ${marked(str(p.distractors))}</p>` : ""}`,
  "H5P.Dialogcards": (p) =>
    `${str(p.title)}${str(p.description)}<div class="cards">${list(p.dialogs)
      .map((c) => `<div class="card"><div class="front">${str(c.text)}</div><div class="back">${str(c.answer)}</div></div>`)
      .join("")}</div>`,
  "H5P.Flashcards": (p) =>
    `<p>${str(p.description)}</p><div class="cards">${list(p.cards)
      .map((c) => `<div class="card"><div class="front">${str(c.text)}</div><div class="back">${str(c.answer)}</div>${str(c.tip) ? `<div class="note">${str(c.tip)}</div>` : ""}</div>`)
      .join("")}</div>`,
  "H5P.QuestionSet": (p) => {
    const intro = group(p.introPage);
    return `${intro.showIntroPage ? `<h2>${str(intro.title)}</h2>${str(intro.introduction)}` : ""}<ol class="parts">${list(p.questions)
      .map((q) => `<li>${part(q)}</li>`)
      .join("")}</ol><p class="note">Pass mark: ${String(p.passPercentage ?? "")}%</p>`;
  },
  "H5P.CoursePresentation": (p) =>
    list(group(p.presentation).slides)
      .map((s, i) => `<section class="slide"><h2>Slide ${i + 1}</h2>${list(s.elements).map((e) => (e.action ? part(e.action) : "")).join("")}</section>`)
      .join(""),
  "H5P.AdvancedText": (p) => str(p.text),
};

function render(machineName: string, params: Params): string {
  const renderer = RENDERERS[machineName];
  return renderer ? renderer(params) : `<pre>${escapeText(JSON.stringify(params, null, 2))}</pre>`;
}

function part(value: unknown): string {
  const { library, params } = group(value);
  const machineName = str(library).split(" ")[0] ?? "";
  return `<div class="part"><div class="type">${escapeText(machineName.replace(/^H5P\./, ""))}</div>${render(machineName, group(params))}</div>`;
}

export function previewHtml(title: string, language: string, machineName: string, params: Params): string {
  return `<!doctype html>
<html lang="${escapeText(language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeText(title)}</title>
<style>
:root { color-scheme: light dark; --fg: #1d1d1f; --bg: #fff; --muted: #6e6e73; --line: #d2d2d7; --right: #1a7f37; --wrong: #b42318; --mark: #fff3bf; }
@media (prefers-color-scheme: dark) { :root { --fg: #f5f5f7; --bg: #161618; --muted: #a1a1a6; --line: #3a3a3c; --right: #4ac26b; --wrong: #ff7b72; --mark: #5c4a00; } }
body { font: 16px/1.5 system-ui, sans-serif; color: var(--fg); background: var(--bg); max-width: 760px; margin: 0 auto; padding: 24px 16px; }
header { border-bottom: 1px solid var(--line); margin-bottom: 16px; }
header p, .type, .note { color: var(--muted); font-size: 14px; }
.answers { list-style: none; padding: 0; }
.answers li { border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; margin: 8px 0; }
.answers li.right { border-color: var(--right); }
.mark { font-weight: bold; margin-right: 8px; float: left; }
.right .mark { color: var(--right); } .wrong .mark { color: var(--wrong); }
mark { background: var(--mark); color: inherit; padding: 0 4px; border-radius: 4px; }
.cards { display: grid; gap: 12px; }
.card { border: 1px solid var(--line); border-radius: 8px; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.card .note { grid-column: 1 / -1; }
.back { border-left: 1px dashed var(--line); padding-left: 12px; }
.part, .slide { border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin: 12px 0; }
.type { text-transform: uppercase; letter-spacing: .04em; }
</style>
</head>
<body>
<header><h1>${escapeText(title)}</h1><p>${escapeText(machineName)} · ${escapeText(language)} · preview of the content, not the H5P player</p></header>
<main>
${render(machineName, params)}
</main>
</body>
</html>
`;
}
