<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit-extensions/main/extensions/docker-lab/assets/logo.svg" alt="Logo de docker-lab: un cubo dentro de un borde discontinuo, un sandbox" width="112"/>

# docker-lab

**Tu agente de IA ejecuta y prueba software en laboratorios de Docker, sin tocar tu ordenador.**<br/>
Herramientas, servicios y código ajeno en contenedores aislados, comprobados ejecutándolos, a través de docker-mcp, en el modo que elijas.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Docker 24+](https://img.shields.io/badge/Docker-24%2B-1d63ed?logo=docker&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Documentación de docker-mcp](https://falkenslab.github.io/docker-mcp/es/)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), a Claude Code o a Codex el servidor [docker-mcp](https://github.com/falkenslab/docker-mcp) y lo que hay que saber para usarlo: Docker como laboratorio donde el agente ejecuta y prueba software (una herramienta que no está instalada, una base de datos durante un rato, un script que te han pasado, un proyecto que hay que comprobar) en contenedores aislados, sin internet, sin montar el equipo y con límites, de forma que no se instala nada en tu ordenador ni se ejecuta en él nada que no sea de fiar. Comprueba que un código, unas instrucciones o una entrega funcionan ejecutándolos, con un veredicto y sus pruebas, y, en modo full, también gestiona tu Docker. Sabe de Docker, no de enseñar ni de estudiar: un agente que sabe enseñar, como [miyagi](https://github.com/falkenslab/miyagi), o aprender, como [padawan](https://github.com/falkenslab/padawan), la instala para ejecutar y comprobar prácticas. Ejecuta docker-mcp desde npm, a una versión fija, con el Docker de tu ordenador.

## ✨ Por qué esta extensión

- 🧪 **Nada instalado ni nada ajeno en tu ordenador.** Lo que hay que probar se ejecuta en un laboratorio: sin internet, sin montar el equipo, con límites de CPU y memoria, y se borra con una llamada.
- 🎚️ **Tú decides hasta dónde llega.** `read` solo mira, `lab` solo ejecuta laboratorios, `full` hace todo lo que hace Docker; una herramienta fuera del modo no existe para el agente.
- 🛡️ **Pregunta antes de lo peligroso.** Eliminar cualquier cosa espera a tu sí, y un contenedor privilegiado o el socket de Docker necesitan tu permiso explícito.
- ✅ **Comprobado ejecutando, no leyendo.** Si algo funciona se responde con las órdenes ejecutadas, sus códigos de salida y su salida, y un laboratorio puede llevar su propia comprobación.
- 🔧 **Explica, nunca instala.** Sin Docker, o con Docker parado, dice cómo instalarlo o arrancarlo.
- 🤖 **Para docentes y estudiantes.** Laboratorios para prácticas que se comprueban solas; instalada en modo `lab`, el agente de un alumno tiene los laboratorios y nada más.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, [Docker](https://docs.docker.com/get-started/get-docker/) 24 o posterior, en marcha, y un agente con agent-kit 0.23 o posterior, Claude Code 2.1.271 o posterior, o Codex.

```bash
# Un agente hecho con agent-kit (su propia orden)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add docker-lab@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install docker-lab@falkenslab
```

Ambos piden sus ajustes al instalarla: primero el modo (`lab` para darle solo los laboratorios, como a un alumno), y las opciones de los laboratorios de abajo. Luego pregunta: «¿Está Docker en marcha, y en qué modo estás?».

Codex también la instala (`codex plugin marketplace add falkenslab/agent-kit-extensions` y luego `codex plugin add docker-lab@falkenslab`), con sus skills y su servidor, pero no tiene ajustes de plugins: funciona en modo `full` con la carpeta de laboratorios por defecto. Para otro modo, añade docker-mcp como un servidor propio, como explica [su página de configuración](https://falkenslab.github.io/docker-mcp/es/configuration).

## ⚙️ Ajustes

| Ajuste | Qué hace | Por defecto |
| --- | --- | --- |
| `mode` | `full` (todo, preguntando antes de lo peligroso), `lab` (solo laboratorios) o `read` (solo mirar) | `full` |
| `scopes` | Solo algunas áreas, separadas por comas: `containers`, `images`, `volumes`, `networks`, `compose`, `system`, `labs` | todas |
| `labs_dir` | La carpeta con los laboratorios, una carpeta por laboratorio | `labs` en su carpeta de datos |
| `allow_internet` | Los laboratorios salen a internet y publican puertos | no |
| `cpus` | CPU por servicio de un laboratorio | `1` |
| `memory` | Memoria por servicio de un laboratorio | `512m` |
| `allowed_images` | Imágenes que puede usar un laboratorio, separadas por comas | cualquiera |

Cámbialos después con `my-agent extension config docker-lab`, en el chat con `/extensions config docker-lab`, desde los ajustes de extensiones de un agente de escritorio, o en `/plugin` de Claude Code. docker-mcp los lee al arrancar, así que un cambio se aplica en la siguiente sesión.

## 💬 Qué puedes pedir

- 🧑‍💻 «No tengo Python 3.13: prueba este script con él, sin instalar nada».
- 🧑‍💻 «Me han pasado este repositorio: ¿compila y pasan sus tests?».
- 🧑‍💻 «Arranca un PostgreSQL 17 con un volumen para sus datos, en el puerto 5432 solo para este ordenador».
- 🧑‍💻 «¿Por qué mi contenedor web se reinicia sin parar? Mira sus logs».
- 👩‍🏫 «Sigue mi enunciado paso a paso en un laboratorio y dime dónde falla; luego comprueba que la solución pasa».
- 👩‍🏫 «Monta un laboratorio con una aplicación web y su base de datos, con una comprobación de que los datos sobreviven a un reinicio».
- 🧑‍🎓 «Arranca el laboratorio de mi práctica y dime si ya funciona».
- 🧑‍🎓 «Reinicia mi laboratorio: me he cargado la base de datos».

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/docker-mcp@0.1.0`, sus 47 herramientas acotadas por tu modo y tus áreas |
| 🧪 `try-in-a-lab` | Probar una herramienta, un servicio o código ajeno en un laboratorio desechable: la imagen, el laboratorio, el informe y la limpieza |
| 🏗️ `build-a-lab` | Un laboratorio reproducible de uno o varios servicios: su fichero de Compose y su comprobación, las reglas de seguridad, arrancarlo, reiniciarlo y pararlo |
| ✅ `verify-by-running` | Si un código, unas instrucciones, un enunciado y su solución o una entrega funcionan, con un veredicto y sus pruebas, y escribir la comprobación de un laboratorio |
| 🐳 `use-docker` | Tu Docker: contenedores, imágenes, volúmenes, redes, Compose y limpieza, qué confirmar, las opciones peligrosas y qué hacer si falta Docker |

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code: `.claude-plugin/plugin.json` (sus ajustes en `userConfig`, los datos de agent-kit en `metadata["agent-kit"]` y Docker como requisito), `.mcp.json` y `skills/`. Para probar un cambio, enlázala en un agente en vez de instalarla (`my-agent extension add ./extensions/docker-lab --link`) y compruébala con `claude plugin validate --strict extensions/docker-lab`. Cómo la ejecuta agent-kit: [Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
