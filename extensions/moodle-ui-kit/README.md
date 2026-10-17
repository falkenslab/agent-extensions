<div align="center">

<img src="assets/logo.svg" alt="moodle-ui-kit logo: a styled activity card and a green feedback card" width="96"/>

# moodle-ui-kit

**A clean visual style for what your AI agent publishes in Moodle.**<br/>
Statements, code, solutions and quiz questions with inline styles, so they look right even on sites that strip CSS.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 5.x](https://img.shields.io/badge/Moodle-5.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[🧩 Based on noeper's moodle-ui-kit](https://github.com/noeper/moodle-ui-kit)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit), or Claude Code, a visual style for Moodle: an assignment's statement with its goal and deliverable, code blocks to copy, a solution with its explanation, a quiz question's text and its feedback. It's based on [moodle-ui-kit](https://github.com/noeper/moodle-ui-kit), the kit [noeper](https://github.com/noeper) made for teaching in Vocational Training: every style is inline, because many Moodle sites (regional education departments' among them) don't allow CSS or theme changes in statements and questions. The agent fills the templates and publishes them with [moodle-teacher](../moodle-teacher/), hidden first and checked; a course with a style of its own keeps it.

## ✨ Why this extension

- 🎨 **A course that looks cared for from the first activity.** An empty course has no style to copy; these templates give it one.
- 🧱 **Inline styles only.** No CSS, no classes, no theme changes: it works on sites that strip them.
- ♿ **Accessible.** Real headings in order, readable contrast, and labels that say what the emojis decorate.
- ❓ **Quiz questions that import well.** Styled questions go in through Moodle XML or one by one, never through GIFT, whose special characters are everywhere in inline styles.
- 🌍 **In the course's language.** The labels (Goal, Statement, Deliverable…) are written in the language the course uses.

## 🚀 Quick start

You need an agent on agent-kit 0.22 or later, or Claude Code 2.1.271 or later, with [moodle-teacher](../moodle-teacher/) to publish in Moodle.

```bash
# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle-teacher@falkenslab
my-agent extension add moodle-ui-kit@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle-teacher@falkenslab
claude plugin install moodle-ui-kit@falkenslab
```

It has no settings of its own.

## 💬 What you can ask

- 👩‍🏫 "Create the unit 3 practice with the moodle-ui-kit style: goal, statement with the commands, and what to hand in."
- 👩‍🏫 "Make a quiz on volumes with two questions, styled, with feedback for each answer."
- 👩‍🏫 "Restyle the statement of practice 2 with moodle-ui-kit, keeping its text."

## 📸 See it at work

A quiz an agent built with moodle-teacher and this extension, in Moodle's own preview: each question's text in its white box, and the feedback with its green label.

<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit-extensions/main/extensions/moodle-ui-kit/assets/quiz-preview.png" alt="A Moodle quiz preview: the question's text in a white box with a question mark, and the feedback to the chosen answer in a white box with a green 'Retroalimentación' label" width="760"/>

</div>

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🎨 `style-content` | The skill: which template for what, how to fill it in, how to publish it and check that the site kept the styles |
| 🧠 `activity` | An assignment's statement: title, goal, statement, deliverable |
| 💻 `code` | A block of code or commands to copy |
| ✅ `feedback` | A solution with its explanation and code |
| ❓ `question` | A quiz question's text, on a white background |
| 🟢 `question-feedback` | A quiz answer's or question's feedback |

The five templates are noeper's, adapted: real headings instead of bold paragraphs, labels in the course's language, and a darker grey for the small captions so they read well.

## 🙏 Based on moodle-ui-kit

The templates come from [moodle-ui-kit](https://github.com/noeper/moodle-ui-kit), by [noeper](https://github.com/noeper), released under CC0 1.0 (free to use however you like). Its [demo](https://noeper.github.io/moodle-ui-kit/) shows them as a teacher copies them into Moodle by hand; this extension lets an agent do it.

## 🛠️ Developing

The extension is a Claude Code plugin with no server: `.claude-plugin/plugin.json` (agent-kit's data in `metadata["agent-kit"]`) and `skills/style-content/`, with the templates in its `templates/` folder. To try a change, link it into an agent (`my-agent extension add ./extensions/moodle-ui-kit --link`), and check it with `claude plugin validate --strict extensions/moodle-ui-kit`. How agent-kit runs it: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
