<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/h5p/assets/logo.svg" alt="Logo de la extensión h5p: una tarjeta interactiva con una pregunta y tres respuestas, una marcada" width="112"/>

# h5p

**Tu agente de IA escribe contenido interactivo H5P, como un paquete listo para subir.**<br/>
Opción múltiple, verdadero o falso, rellenar huecos, arrastrar palabras, tarjetas, conjuntos de preguntas y presentaciones, comprobados en tu ordenador antes de escribirlos, a través de h5p-mcp.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![npm](https://img.shields.io/npm/v/@falkenslab/h5p-mcp?label=h5p-mcp&color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/h5p-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Documentación de h5p-mcp](https://falkenslab.github.io/h5p-mcp/es/)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), a Claude Code o a Codex el servidor [h5p-mcp](https://github.com/falkenslab/h5p-mcp) y lo que hay que saber para usarlo: convertir las preguntas, los textos con huecos, las tarjetas o las diapositivas que escribe contigo en un paquete `.h5p` en tu ordenador, comprobado según su tipo de contenido antes de escribirlo, en tu idioma y con una vista previa para revisarlo; y leer un paquete que ya existe para revisarlo o cambiarlo. Los paquetes llevan solo su contenido, no el código de H5P, así que pesan poco y se reproducen en cualquier sitio que tenga ese tipo de contenido, como un Moodle con su actividad H5P. No sube nada: en Moodle lo hace la extensión [moodle-teacher](../moodle-teacher/). Sabe de H5P, no de enseñar: un agente que sabe enseñar, como [miyagi](https://github.com/falkenslab/miyagi), la instala para preparar las autoevaluaciones de una clase. Ejecuta h5p-mcp desde npm, a una versión fija.

## ✨ Por qué esta extensión

- 📦 **Paquetes que el sitio acepta.** El formato que Moodle valida y despliega, probado en un sitio real.
- ✅ **Comprobado antes de escribirlo.** Una pregunta sin su respuesta correcta, o un hueco sin su palabra, se rechaza diciendo qué corregir, con las mismas reglas que aplica el sitio.
- 🌍 **En tu idioma.** Los botones y los mensajes salen en el idioma del contenido, con las traducciones de cada tipo.
- 👀 **Revisado antes de subirlo.** Una vista previa sencilla de las preguntas, las respuestas correctas y las tarjetas, sin el reproductor de H5P.
- 🔁 **Se puede leer de vuelta.** El contenido de un paquete que ya existe, con la misma forma, para cambiarlo y volver a crearlo.
- 🪶 **Nada que instalar.** Un solo servidor empaquetado que se ejecuta con `npx`; nada de código de H5P en tu ordenador.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, y un agente con agent-kit, Claude Code 2.1.271 o posterior, o Codex.

```bash
# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add h5p@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install h5p@falkenslab
```

No necesita ajustes. Luego pide: «Hazme cinco preguntas de opción múltiple sobre el ciclo del agua, como un paquete H5P en mi carpeta de Descargas». Codex también la instala (`codex plugin marketplace add falkenslab/agent-extensions` y luego `codex plugin add h5p@falkenslab`).

## 💬 Qué puedes pedir

- 👩‍🏫 «Haz un cuestionario de diez preguntas sobre semántica de HTML5 como Question Set de H5P.»
- 👩‍🏫 «Convierte estos pares de vocabulario en Dialog Cards.»
- 👩‍🏫 «Escribe un texto con huecos sobre las partes de la célula y enséñame la vista previa.»
- 👩‍🏫 «Lee este .h5p y añádele dos preguntas más difíciles.»
- 👩‍🏫 «Sube el paquete al tema 3 de mi curso, oculto.» (con moodle-teacher)

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/h5p-mcp@0.1.0`: `list_h5p_types`, `build_h5p`, `read_h5p` |
| 🧩 `h5p-packages` | Qué tipo para cada cosa, escribir el contenido con la forma y la sintaxis de cada tipo, crearlo y comprobarlo, la vista previa, leer un paquete de vuelta y entregarlo para subirlo |

## 📚 Documentación

- **[Documentación de h5p-mcp](https://falkenslab.github.io/h5p-mcp/es/)**: el servidor y sus ajustes.
- **[Crear paquetes](https://falkenslab.github.io/h5p-mcp/es/packages)**: los tipos de contenido, qué se comprueba, los idiomas y lo que aún no se admite.
- **[Herramientas de h5p-mcp](https://falkenslab.github.io/h5p-mcp/es/reference/tools)**: cada herramienta, con la descripción que lee el agente.

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code: `.claude-plugin/plugin.json` (los datos de agent-kit en `metadata["agent-kit"]`), `.mcp.json` y `skills/`. Para probar un cambio, enlázala en un agente en vez de instalarla (`my-agent extension add ./extensions/h5p --link`) y compruébala con `claude plugin validate --strict extensions/h5p`. Cómo ejecuta agent-kit una extensión: [Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
