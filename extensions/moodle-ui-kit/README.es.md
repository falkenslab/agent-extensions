<div align="center">

<img src="assets/logo.svg" alt="Logo de moodle-ui-kit: una tarjeta de actividad con estilo y una tarjeta verde de retroalimentación" width="96"/>

# moodle-ui-kit

**Un estilo visual cuidado para lo que tu agente de IA publica en Moodle.**<br/>
Enunciados, código, soluciones y preguntas de cuestionario con estilos inline, para que se vean bien incluso en sitios que eliminan el CSS.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 4.5 y 5.x](https://img.shields.io/badge/Moodle-4.5%20%7C%205.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[🧩 Basado en moodle-ui-kit, de noeper](https://github.com/noeper/moodle-ui-kit)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), o a Claude Code, un estilo visual para Moodle: el enunciado de una tarea con su objetivo y su entregable, bloques de código para copiar, una solución con su explicación, el texto de una pregunta de cuestionario y su retroalimentación. Está basada en [moodle-ui-kit](https://github.com/noeper/moodle-ui-kit), el kit que [noeper](https://github.com/noeper) hizo para la docencia en Formación Profesional: todos los estilos son inline, porque muchos sitios Moodle (entre ellos los de las consejerías de educación) no permiten CSS ni cambiar el tema en los enunciados y las preguntas. El agente rellena las plantillas y las publica con [moodle-teacher](../moodle-teacher/README.es.md), primero ocultas y comprobadas; un curso con estilo propio lo conserva.

## ✨ Por qué esta extensión

- 🎨 **Un curso cuidado desde la primera actividad.** Un curso vacío no tiene estilo que copiar; estas plantillas le dan uno.
- 🧱 **Solo estilos inline.** Sin CSS, sin clases, sin cambiar el tema: funciona en los sitios que los eliminan.
- ♿ **Accesible.** Encabezados reales y en orden, contraste legible y etiquetas que dicen lo mismo que los emojis que las decoran.
- ❓ **Preguntas que se importan bien.** Las preguntas con estilo entran en Moodle XML o una a una, nunca en GIFT, cuyos caracteres especiales aparecen por todas partes en los estilos inline.
- 🌍 **En el idioma del curso.** Las etiquetas (Objetivo, Enunciado, Entregable…) se escriben en el idioma que usa el curso.

## 🚀 Empezar

Necesitas un agente con agent-kit 0.22 o posterior, o Claude Code 2.1.271 o posterior, con [moodle-teacher](../moodle-teacher/README.es.md) para publicar en Moodle.

```bash
# Un agente hecho con agent-kit (con su propio comando)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle-teacher@falkenslab
my-agent extension add moodle-ui-kit@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle-teacher@falkenslab
claude plugin install moodle-ui-kit@falkenslab

# Codex
codex plugin marketplace add falkenslab/agent-kit-extensions
codex plugin add moodle-ui-kit@falkenslab
```

No tiene ajustes propios, así que funciona igual en Codex.

## 💬 Qué puedes pedirle

- 👩‍🏫 «Crea la práctica del tema 3 con el estilo de moodle-ui-kit: objetivo, enunciado con los comandos y qué hay que entregar.»
- 👩‍🏫 «Haz un cuestionario sobre volúmenes con dos preguntas, con estilo y retroalimentación para cada respuesta.»
- 👩‍🏫 «Dale el estilo de moodle-ui-kit al enunciado de la práctica 2, sin cambiar su texto.»

## 📸 Así se ve

Un cuestionario que un agente creó con moodle-teacher y esta extensión, en la vista previa de Moodle: el texto de cada pregunta en su recuadro blanco, y la retroalimentación con su etiqueta verde.

<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit-extensions/main/extensions/moodle-ui-kit/assets/quiz-preview.png" alt="Vista previa de un cuestionario en Moodle: el texto de la pregunta en un recuadro blanco con un signo de interrogación, y la retroalimentación de la respuesta elegida en un recuadro blanco con la etiqueta verde «Retroalimentación»" width="760"/>

</div>

## 🧰 Qué trae

| Parte | Qué es |
| --- | --- |
| 🎨 `style-content` | La skill: qué plantilla usar para qué, cómo rellenarla, cómo publicarla y cómo comprobar que el sitio conservó los estilos |
| 🧠 `activity` | El enunciado de una tarea: título, objetivo, enunciado, entregable |
| 💻 `code` | Un bloque de código o de comandos para copiar |
| ✅ `feedback` | Una solución con su explicación y su código |
| ❓ `question` | El texto de una pregunta de cuestionario, sobre fondo blanco |
| 🟢 `question-feedback` | La retroalimentación de una respuesta o de una pregunta |

Las cinco plantillas son las de noeper, adaptadas: encabezados reales en lugar de párrafos en negrita, etiquetas en el idioma del curso y un gris más oscuro en los rótulos pequeños para que se lean bien.

## 🙏 Basado en moodle-ui-kit

Las plantillas vienen de [moodle-ui-kit](https://github.com/noeper/moodle-ui-kit), de [noeper](https://github.com/noeper), publicado con licencia CC0 1.0 (uso libre, como quieras). Su [demo](https://noeper.github.io/moodle-ui-kit/) las muestra tal como un docente las copia a mano en Moodle; esta extensión permite que lo haga un agente.

## 📚 Documentación

- **[moodle-ui-kit de noeper](https://github.com/noeper/moodle-ui-kit)**: el kit original en el que se basa esta extensión.
- **[Documentación de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/)**: el servidor que publica el contenido (a través de moodle-teacher).
- **[Installing extensions](https://falkenslab.github.io/agent-kit/docs/extensions/installing)** (en inglés): en un agente hecho con agent-kit.

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code sin servidor: `.claude-plugin/plugin.json` (los datos de agent-kit en `metadata["agent-kit"]`) y `skills/style-content/`, con las plantillas en su carpeta `templates/`. Para probar un cambio, enlázala en un agente (`my-agent extension add ./extensions/moodle-ui-kit --link`) y compruébala con `claude plugin validate --strict extensions/moodle-ui-kit`. Cómo la ejecuta agent-kit: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
