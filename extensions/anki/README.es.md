<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/anki/assets/logo.svg" alt="Logo de la extensión anki: dos tarjetas, la de delante con una pregunta, una línea divisoria y su respuesta" width="112"/>

# anki

**Tu agente de IA convierte lo que estudias en un mazo de Anki, listo para importar.**<br/>
Tarjetas en un sentido, en los dos o con huecos que rellenar, con etiquetas, imágenes y audio, escritas como un `.apkg` en tu ordenador que actualiza el mazo cuando se exporta otra vez.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit) o a Claude Code su propio servidor MCP, pequeño, y lo que hay que saber para usarlo: convertir las tarjetas que escribe contigo en un mazo de Anki, un archivo `.apkg` en tu ordenador que [Anki](https://apps.ankiweb.net), AnkiDroid y AnkiMobile importan; añadir tarjetas a la exportación de un mazo; y leer un `.apkg` para revisarlo o ampliarlo. Si exportas otra vez el mismo mazo, sus tarjetas se actualizan en Anki en vez de duplicarse, y conservas tu progreso en ellas. No sube ni sincroniza nada: el archivo lo importas tú. Sabe del formato de Anki, no de cómo estudiar: un agente que sí sabe, como [padawan](https://github.com/falkenslab/padawan) para el repaso de un estudiante o [miyagi](https://github.com/falkenslab/miyagi) para dar un mazo a una clase, la instala. Su servidor se ejecuta desde npm con `npx`, en un solo archivo, sin nada más que instalar.

## ✨ Por qué esta extensión

- 🃏 **Los tres tipos de nota que importan.** Anverso y reverso, en los dos sentidos, y cloze (huecos `{{c1::…}}`, una tarjeta por número), cada uno con un extra opcional bajo la respuesta.
- 🔁 **Se exporta otra vez y se actualiza.** Las notas reciben su id del mazo y de su anverso, así que un mazo corregido actualiza tus tarjetas en Anki, con tu progreso, en vez de añadir copias.
- ➕ **Añadir a un mazo.** El `.apkg` de un mazo con más tarjetas, conservando sus notas, sus ids y sus archivos.
- 🖼️ **Imágenes y audio.** Archivos de tu ordenador, referenciados en las tarjetas y metidos en el mazo.
- ✅ **Comprobado antes de escribirlo.** Un cloze sin hueco, una imagen que falta, un anverso repetido o un script en un campo se rechaza diciendo qué corregir; no se escribe encima de nada sin tu sí.
- 🪶 **Nada que instalar.** Un solo archivo de servidor, ejecutado con `npx`: sin código nativo ni red: funciona sin conexión.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, un agente con agent-kit o Claude Code, y Anki (de escritorio, AnkiDroid o AnkiMobile) para estudiar el mazo.

```bash
# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add anki@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install anki@falkenslab
```

No necesita ajustes. Luego pide: «Hazme un mazo de Anki con los veinte verbos irregulares que hemos visto, en mi carpeta de Descargas». Importa el archivo en Anki con Archivo > Importar, o abriéndolo en el móvil. Codex también la instala (`codex plugin marketplace add falkenslab/agent-extensions` y luego `codex plugin add anki@falkenslab`), y allí funciona igual, skill y servidor.

## 💬 Qué puedes pedir

- 🎓 «Convierte mis apuntes de la Revolución francesa en tarjetas de Anki, un dato por tarjeta.»
- 🎓 «Haz tarjetas cloze con estas definiciones y etiquétalas por tema.»
- 🎓 «Un mazo de vocabulario español–inglés, en los dos sentidos, con los audios de esta carpeta.»
- 🎓 «He corregido tres respuestas: exporta el mazo otra vez para que Anki lo actualice.»
- 👩‍🏫 «Añade estas diez tarjetas al mazo de biology.apkg para mis alumnos.»
- 🎓 «¿Qué hay en este .apkg?»

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/anki-mcp@0.1.0` (un archivo, unos 1,7 MB): `write_deck`, `add_to_deck`, `read_deck`, `server_info` |
| 🧩 `anki-decks` | Qué tipo de nota para cada cosa, el HTML de los campos, la sintaxis cloze, etiquetas, archivos, nombres de mazo y submazos, exportar otra vez para actualizar, añadir a un mazo, dónde guardarlo y cómo importarlo |

## 📚 Documentación

- **[Manual de Anki](https://docs.ankiweb.net)**: importar, tipos de nota, cloze y estudiar.
- **[Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)**: cómo ejecuta agent-kit una extensión con su propio servidor.

## 🛠️ Desarrollo

El código del servidor está en [`mcps/anki/`](../../mcps/anki/), publicado en npm como `@falkenslab/anki-mcp`; allí `npm install`, `npm run build` y `npm test` lo construyen y lo prueban. La extensión ejecuta una versión publicada, fijada en `.mcp.json`: un servidor nuevo se publica primero y luego se fija aquí. Para probar un cambio, enlaza la extensión en un agente (`my-agent extension add ./extensions/anki --link`) y compruébala con `claude plugin validate --strict extensions/anki`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
