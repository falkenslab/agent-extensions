<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/documents/assets/logo.svg" alt="Logo de la extensión documents: una página con un título, líneas de texto y una tabla pequeña, con la esquina doblada" width="112"/>

# documents

**Tu agente de IA escribe documentos Word con la plantilla de tu centro.**<br/>
Un .docx desde Markdown con los estilos de la plantilla, conservando su encabezado, su pie y su logo y con sus campos rellenos, en tu ordenador.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), a Claude Code o a Codex su propio servidor MCP, pequeño, y lo que hay que saber para usarlo: convertir lo que escribe contigo (una memoria, un documento del departamento, una programación) en un `.docx` con la plantilla que pide tu centro. La plantilla se queda entera, con sus estilos, su configuración de página, su encabezado, su pie y su logo; el contenido va en su cuerpo, o donde la plantilla marca `{{content}}`, con cada título, lista y tabla en los estilos de la propia plantilla y sus `{{campos}}` rellenos. El agente lee primero la plantilla, y el documento después de escribirlo, antes de que lo abras en Word o LibreOffice. No escribe sobre un archivo que ya existe sin tu permiso, y no sube ni envía nada. Sabe del formato de Word, no de lo que debe decir un informe: un agente que sabe enseñar, como [miyagi](https://github.com/falkenslab/miyagi), la instala para escribir los informes del curso con la plantilla del centro. Su servidor va empaquetado en la extensión, en JavaScript puro.

## ✨ Por qué esta extensión

- 🏫 **Tu plantilla, no una parecida.** Sus estilos, letras, tamaño de página, márgenes, encabezado, pie y logo se quedan como están: solo se escribe el cuerpo.
- 🔤 **Los estilos de la plantilla.** Los títulos, las listas, las tablas, las citas y los enlaces toman los estilos que define la plantilla, encontrados por su nombre en el idioma de Word (`Título 1` igual que `Heading 1`), o los que elijas.
- 🧩 **Campos rellenos.** `{{curso}}`, `{{fecha}}` o `{{profesor}}` en el cuerpo, el encabezado o el pie reciben su valor, aunque Word los haya partido por dentro.
- 📍 **Alrededor de lo que debe quedarse.** Con un párrafo `{{content}}`, la portada y el bloque de firma de la plantilla se quedan antes y después del documento.
- 🔍 **Comprobado antes de que lo abras.** El agente lee el resultado: el estilo de cada párrafo, los campos sin rellenar, los estilos que faltan.
- 🪶 **Nada que instalar.** Un solo servidor empaquetado que se ejecuta con Node.js; nada por la red.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, y un agente con agent-kit o Claude Code 2.1.271 o posterior.

```bash
# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add documents@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install documents@falkenslab
```

No necesita ajustes. Luego pide: «Escribe la memoria del departamento como .docx con la plantilla que tengo en Documentos». Codex también la instala (`codex plugin marketplace add falkenslab/agent-extensions` y luego `codex plugin add documents@falkenslab`), pero allí solo carga su skill: su servidor se ejecuta desde la carpeta de la extensión (`${CLAUDE_PLUGIN_ROOT}`), que Codex no expande en `.mcp.json`.

## 💬 Qué puedes pedir

- 👩‍🏫 «¿Qué estilos y campos tiene esta plantilla?»
- 👩‍🏫 «Escribe la memoria anual del módulo con la plantilla del centro, con la tabla de resultados y el gráfico.»
- 👩‍🏫 «Rellena los campos de curso, módulo y profesor de la plantilla, y pon el documento donde dice {{content}}.»
- 👩‍🏫 «Usa el estilo "Título informe" de la plantilla para los títulos principales.»
- 👩‍🏫 «Lee el .docx y dime si quedó algo sin rellenar.»

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `dist/server.mjs`, empaquetado en la extensión: `read_template`, `write_docx`, `read_docx`, `server_info` |
| 🧩 `docx-from-template` | Leer primero la plantilla, escribir el Markdown para sus estilos, los campos y las imágenes, guardar sin sobrescribir y comprobar el resultado antes de que lo revise la persona |

## 📚 Documentación

- **[Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)**: cómo ejecuta agent-kit una extensión con su propio servidor empaquetado, como esta.
- **[Referencia de las extensiones](https://falkenslab.github.io/agent-kit/es/docs/extensions/reference)**: cada campo del manifiesto y de `metadata["agent-kit"]`.
- **[Office Open XML](https://learn.microsoft.com/es-es/office/open-xml/word/overview)**: el formato de un `.docx`.

## 🛠️ Desarrollo

El código del servidor está en [`mcps/documents/`](../../mcps/documents/), que se publica en npm como `@falkenslab/documents-mcp`; allí `npm install`, `npm run build` y `npm test` lo construyen y lo prueban, y la build lo copia en el `dist/server.mjs` de esta extensión, que se guarda en el repositorio hasta que la extensión lo ejecute desde npm. Para probar un cambio, enlaza la extensión en un agente (`my-agent extension add ./extensions/documents --link`) y compruébala con `claude plugin validate --strict extensions/documents`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
