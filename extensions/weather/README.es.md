<div align="center">

<img src="assets/logo.svg" alt="Logo de weather: un sol detrás de una nube" width="96"/>

# weather

**El tiempo en tu ciudad, para un agente que planifica contigo.**<br/>
Hoy y los próximos días, de Open-Meteo: sin cuenta y sin clave.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Cómo se hizo, paso a paso](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** · [🇬🇧 Read in English](README.md)

</div>

weather da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), o a Claude Code, la previsión para la ciudad de la persona: la temperatura ahora y, para cada día, las máximas y mínimas, la probabilidad de lluvia y el viento. También es el ejemplo de agent-kit de una extensión instalable con su propio servidor MCP, escrito con el SDK oficial de MCP y empaquetado en un solo archivo: el tutorial [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing) la construye desde cero.

## ✨ Qué enseña

- 🔌 **Su propio servidor MCP**, `src/server.mjs`, empaquetado con esbuild en `dist/server.mjs`: el kit instala archivos y nunca ejecuta `npm install`.
- ⚙️ **Un ajuste que la persona da una vez**, su ciudad (y las unidades), como `userConfig` de Claude Code.
- 🔒 **Una herramienta que solo lee**, marcada con `readOnlyHint`: el modo plan la deja pasar sin una lista en el manifiesto.
- 🏷️ **Etiquetas** para el chat en inglés y en español, un **logo** para el catálogo, una **skill** y un **comando**.

## 🚀 Empezar

```bash
# Un agente hecho con agent-kit (con su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add weather@falkenslab --set "city=Santa Cruz de Tenerife"

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install weather@falkenslab

# Codex
codex plugin marketplace add falkenslab/agent-extensions
codex plugin add weather@falkenslab
```

En Codex se carga su skill, pero su servidor no arranca: Codex no expande `${CLAUDE_PLUGIN_ROOT}`, la carpeta de la extensión, en `.mcp.json`. Luego pregunta: «¿Qué tiempo va a hacer esta semana?», «¿Cuándo salgo a caminar mañana?», o `/weather:today`.

## ⚙️ Ajustes

| Ajuste | Qué hace | Por defecto |
| --- | --- | --- |
| `city` | Dónde estás, por ejemplo `Santa Cruz de Tenerife` | obligatorio |
| `units` | `metric` (°C, km/h) o `imperial` (°F, mph) | `metric` |

## 💬 Qué puedes pedirle

- 🌤️ «¿Qué tiempo va a hacer esta semana?»
- ☔ «¿Va a llover mañana por la tarde? ¿Me llevo el paraguas?»
- 🚲 «¿Qué día de esta semana es mejor para ir al trabajo en bici?»
- 🧳 «Me voy a Sevilla el viernes: ¿qué me llevo?»

## 🧰 Qué trae

| Parte | Qué es |
| --- | --- |
| 🔌 `forecast` | El tiempo ahora y los próximos días (de 1 a 7) en tu ciudad, o en otra que nombres |
| 🗓️ `plan-the-day` | Una skill: planificar el día o la semana según la previsión, con un plan B si es probable que llueva |
| ☀️ `/weather:today` | El tiempo de hoy en dos líneas |

## 📚 Documentación

- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)** (en inglés): el tutorial de agent-kit, que construye esta extensión paso a paso.
- **[The extensions reference](https://falkenslab.github.io/agent-kit/docs/extensions/reference)** (en inglés): todos los campos del manifiesto y de `metadata["agent-kit"]`.
- **[Open-Meteo](https://open-meteo.com/)**: el servicio de previsión gratuito que consulta, sin clave de API.

## 🛠️ Desarrollo

El código del servidor está en `src/server.mjs`; `npm install` y luego `npm run build` escriben `dist/server.mjs`, que se sube al repositorio (`package.json` y `src/` solo sirven para generarlo). Prueba un cambio enlazándola en un agente: `my-agent extension add ./extensions/weather --link --set city=Madrid`, y luego `/extensions disable weather` y `enable` después de cada build.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
