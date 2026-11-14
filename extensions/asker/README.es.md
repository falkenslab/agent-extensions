<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/asker/assets/logo.svg" alt="Logo de la extensión asker: una hoja de definiciones detrás de una tarjeta de pregunta con tres opciones, una marcada" width="112"/>

# asker

**Tu agente de IA convierte tus propias definiciones en preguntas de examen con Asker, revisadas contigo antes de llegar a Moodle.**<br/>
Un archivo de definiciones escrito a partir de tus apuntes y comprobado, preguntas generadas con él en Moodle XML o GIFT, y una lista para repasar dejando fuera las que no quieras.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit) o a Claude Code un servidor MCP que maneja [Asker](https://github.com/teuton-software/asker), y lo que tiene que hacer con él. Asker hace muchas preguntas de examen (verdadero o falso, opción múltiple, respuesta corta, emparejamiento, ordenación) a partir de un archivo de definiciones: conceptos con sus nombres, etiquetas y definiciones, tablas, secuencias, problemas y código. El agente redacta ese archivo a partir de tus apuntes, sin añadir contenido propio, y lo comprueba con Asker; Asker genera las preguntas en tu ordenador, sin conectarse a internet; y tú las revisas con el agente, que escribe una copia sin las que dejes fuera, lista para que la extensión [moodle-teacher](../moodle-teacher/) la importe en un banco de preguntas. Sabe de Asker, y de las prácticas de su autor, no de cómo evaluar: la instala un agente que sí sabe, como [miyagi](https://github.com/falkenslab/miyagi).

## ✨ Por qué esta extensión

- 📝 **Tus definiciones son la fuente.** Las preguntas salen del archivo que revisaste, igual cada vez que necesites más; el agente nunca escribe el texto de una pregunta.
- ✅ **Comprobado antes de ejecutarlo, en palabras claras.** Lo que hace tropezar a Asker (espacios, tabuladores, caracteres invisibles, una definición vacía, un enlace que no es una imagen, otro archivo en la carpeta) con su línea, los mensajes de Asker explicados y cuántas preguntas daría cada concepto.
- 🎛️ **Las opciones de Asker, elegidas.** Qué tipos de pregunta y plantillas, la categoría del banco de preguntas, la penalización por respuesta incorrecta y preguntas excluidas por nombre.
- 👀 **Revisadas antes de llegar a un curso.** Cada pregunta con sus respuestas y su plantilla de Asker, una página cada vez, un subagente para repasar cientos, y una copia sin las que rechaces; el original se queda como está.
- 🧩 **Lo que Moodle acepta.** Moodle XML, completo; GIFT si se pide, diciendo lo que no puede llevar; emparejamiento de arrastrar y soltar solo para un Moodle con su plugin.
- 🔒 **Sin conexión.** La búsqueda de imágenes en internet de Asker se queda apagada.

## 🚀 Inicio rápido

Necesitas [Node.js](https://nodejs.org) 20 o posterior, un agente sobre agent-kit o Claude Code, y Asker: [Ruby](https://www.ruby-lang.org) 3.0 o posterior y su gema.

```bash
# Ruby y después Asker (Windows: winget install RubyInstallerTeam.Ruby.3.4; macOS: brew install ruby; Linux: sudo apt install ruby)
gem install asker-tool --no-document

# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add asker@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install asker@falkenslab
```

No necesita ajustes; reinicia la aplicación si instalaste Ruby con ella abierta (el agente lo comprueba con `check_requirements`). Luego pide: «Haz preguntas con Asker a partir de mis apuntes sobre dispositivos de red, en mi carpeta Documentos/asker». Codex también la instala (`codex plugin marketplace add falkenslab/agent-extensions` y luego `codex plugin add asker@falkenslab`), y allí funcionan igual sus skills y su servidor; no tiene subagentes ni hooks.

## 💬 Qué puedes pedir

- 👩‍🏫 «Escribe un archivo de Asker con estos apuntes sobre el ciclo del agua y enséñamelo antes de generar».
- 👩‍🏫 «Comprueba mi archivo de definiciones y dime qué no le gusta a Asker».
- 👩‍🏫 «Genera solo las preguntas de secuencias y de emparejamiento, sin las de palabras mal escritas, en la categoría Tema 3».
- 👩‍🏫 «Repasa las 400 preguntas y dime cuáles debería mirar».
- 👩‍🏫 «Importa las preguntas revisadas en el banco de preguntas de mi curso».

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/asker-mcp@0.1.0`: `asker_input_reference`, `check_input`, `generate_questions`, `read_questions`, `exclude_questions`, `check_requirements`, `server_info` |
| 🧩 `asker-inputs` | Escribir un archivo de definiciones a partir de los apuntes de la persona tal como lo lee Asker y como aconseja su autor (definiciones inequívocas, nombres de verdad, tablas que se pueden compartir, secuencias reales, problemas para las materias prácticas), y comprobarlo y pulirlo |
| 🧩 `asker-questions` | Generar con las opciones y la carpeta de salida adecuadas, revisar cada pregunta con la persona por grupo y plantilla, dejar fuera las rechazadas e importar el resto con moodle-teacher; en miyagi, el botón «Preguntas con Asker» |
| 🧩 `asker-troubleshooting` | Qué sale mal y cómo arreglarlo: la instalación, archivos que Asker no lee, otros archivos en la carpeta, imágenes y enlaces, preguntas que faltan o se rechazan |
| 🤖 `input-reviewer` | Subagente: revisa un archivo de definiciones según las reglas de Asker y los apuntes de la persona, y devuelve qué arreglar (no cambia nada) |
| 🤖 `question-reviewer` | Subagente: repasa un archivo generado y devuelve las preguntas que dejar fuera o mirar, con el motivo (no cambia nada) |
| 🪝 Hook | En Claude Code, después de escribir o editar un `.haml`: un vistazo rápido a tabuladores, caracteres invisibles, sangrías impares y definiciones vacías, y un recordatorio de pasar `check_input` |

## 📐 Buenas prácticas con Asker

De la documentación de Asker y de los tutoriales de su autor, que siguen las skills:

- **Trabaja en el contenido, no en las preguntas.** Asker escribe muchas preguntas con cada línea; una definición mejor o una tabla nueva las multiplica.
- **Una definición encaja con un solo concepto**, en toda la carpeta, y no lo nombra. Lo que podría describir a varios conceptos va en una tabla.
- **Los nombres son nombres**: sinónimos, singular y plural, el nombre en otro idioma; dos cosas puestas como nombres son dos conceptos.
- **Las tablas son datos compartidos.** Un elemento de lista con una aclaración entre paréntesis son dos columnas; una fila con su propia definición puede ser su propio concepto; `sequence` solo cuando las filas van de verdad en orden.
- **Problemas para las materias prácticas**, con cuatro casos o más.
- **Una carpeta por materia**, sin nada más que acabe en `.xml`; las preguntas generadas, en una subcarpeta.
- **Revisa antes de importar**, e importa el archivo que revisaste: cada ejecución es distinta.

## 📚 Documentación

- **[La documentación de Asker](https://github.com/teuton-software/asker/tree/master/docs)**: su lenguaje de entrada, sus plantillas de preguntas y tutoriales en español.
- **[dvarrui/asker-inputs](https://github.com/dvarrui/asker-inputs)**: los archivos de definiciones de su autor, por materia y de muchos años: ejemplos de uso, no la referencia de Asker, y algunos están desfasados.
- **[Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)**: cómo ejecuta agent-kit una extensión y comprueba lo que necesita.

## 🛠️ Desarrollo

El código del servidor está en [`mcps/asker/`](../../mcps/asker/), publicado en npm como `@falkenslab/asker-mcp`; allí `npm install`, `npm run build` y `npm test` lo construyen y lo prueban (con el Asker real si está instalado). La extensión ejecuta una versión publicada, fijada en `.mcp.json`: un servidor nuevo se publica primero y luego se fija aquí. El hook (`hooks/after-edit.mjs`) no tiene dependencias; se prueba pasándole una llamada de herramienta (`{"tool_input":{"file_path":"…/archivo.haml"}}`). Para probar un cambio, enlaza la extensión en un agente (`my-agent extension add ./extensions/asker --link`) y compruébala con `claude plugin validate --strict extensions/asker`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
