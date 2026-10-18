<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/moodle-mcp/main/docs/static/img/logo.svg" alt="Logo de moodle-mcp: la m de Moodle enchufada a una toma de corriente" width="112"/>

# moodle-student

**Tu agente de IA te ayuda en los cursos de Moodle en los que estudias, como tú, y sabe hacerlo bien.**<br/>
Las herramientas de alumno de moodle-mcp, con las buenas prácticas para organizarte, entregar, hacer cuestionarios y aprender de la retroalimentación.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 4.5 y 5.x](https://img.shields.io/badge/Moodle-4.5%20%7C%205.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Documentación de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión, para estudiantes, da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), o a Claude Code, el servidor [moodle-mcp](https://github.com/falkenslab/moodle-mcp) con las herramientas de alumno y lo que hay que saber para usarlas: skills para leer un curso, planificar lo que queda, entregar tareas, hacer cuestionarios, los foros y las demás actividades, y leer notas y retroalimentación, y una skill para lo que vence esta semana. Sabe de Moodle, no de estudiar: un agente que sabe aprender, como [padawan](https://github.com/falkenslab/padawan), la instala para trabajar en Moodle. Para los cursos que impartes está [moodle-teacher](../moodle-teacher/README.es.md). Ejecuta moodle-mcp desde npm, a una versión fija, con un navegador real en tu ordenador y con tu sesión.

## ✨ Por qué esta extensión

- 🧭 **Buenas prácticas, no solo herramientas.** Sus skills dicen cómo funciona cada actividad en Moodle, qué es definitivo y qué comprobar después.
- ✋ **Nada definitivo sin ti.** Empezar un intento de cuestionario, enviar una tarea, aceptar la declaración de autoría o publicar en un foro espera a tu sí.
- 🔐 **Tu sesión, nunca tu contraseña.** Entras tú, en una ventana del navegador que abre moodle-mcp.
- 🕶️ **Los demás siguen siendo anónimos.** Compañeros y docentes llegan al agente con alias, salvo que elijas otra cosa.
- 🎚️ **Tú pones los límites al instalarla.** Acceso de solo lectura, y cómo llegan los datos de los demás.
- 🌐 **Varios sitios Moodle.** El de tu instituto, el de tu universidad y una plataforma de formación, por separado.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, y un agente con agent-kit 0.22 o posterior, o Claude Code 2.1.271 o posterior.

```bash
# Un agente hecho con agent-kit (con su propio comando)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle-student@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle-student@falkenslab
```

Los dos piden sus ajustes al instalarla: tus sitios Moodle (`nombre=dirección`, por ejemplo `instituto=https://campus.miinstituto.org`) y los opcionales de abajo. La primera vez que trabaja en un sitio se abre una ventana del navegador para que entres.

Codex también la instala (`codex plugin marketplace add falkenslab/agent-kit-extensions` y luego `codex plugin add moodle-student@falkenslab`), con sus skills y su servidor. Codex no tiene ajustes de plugins, así que la primera vez el agente te pide en el chat la dirección de tu Moodle. Codex guarda un servidor por nombre y las dos extensiones de Moodle llaman al suyo `moodle`, así que activa solo una de `moodle-student` y `moodle-teacher` en él.

## ⚙️ Ajustes

| Ajuste | Qué hace | Por defecto |
| --- | --- | --- |
| `sites` | Tus sitios Moodle, cada uno como `nombre=dirección`; empieza por el primero | obligatorio |
| `headless` | El navegador trabaja sin verse (se abre una ventana para entrar, o si pides mirar) | sí |
| `access` | `read`: solo mirar, sin entregar, responder ni publicar | `write` |
| `student_data` | `pseudonymize` (alias), `block` (nada) o `clear` (nombres: solo para una IA que funcione en tu propio ordenador) | `pseudonymize` |

Cámbialos después con `my-agent extension config moodle-student`, en el chat con `/extensions config moodle-student`, en los ajustes de extensiones de un agente de escritorio o en el `/plugin` de Claude Code.

## 💬 Qué puedes pedirle

- 🧑‍🎓 «¿Qué tengo que entregar esta semana, y por dónde empiezo?»
- 🧑‍🎓 «Sube mi informe.pdf a la tarea del tema 2 y enséñamelo antes de enviarlo.»
- 🧑‍🎓 «¿Cuántos intentos tiene el cuestionario del tema 1, y hay límite de tiempo?»
- 🧑‍🎓 «Enséñame en qué fallé en mi último intento del cuestionario.»
- 🧑‍🎓 «¿Alguien ha preguntado en el foro por la caché del Dockerfile? Si no, ayúdame a preguntarlo.»
- 🧑‍🎓 «¿Cómo voy en el curso, y qué me dijo el profesor de la práctica 1?»

## 📸 Míralo en acción

<p align="center">
<img src="https://raw.githubusercontent.com/falkenslab/agent-kit-extensions/main/extensions/moodle-student/assets/screenshot.png" alt="La tarea de un alumno en Moodle, enviada para calificar con el PDF que subió el agente" width="760"/>
</p>

<p align="center"><em>En moodle-sandbox: el informe de un alumno, subido y enviado por Claude Code después de enseñárselo.</em></p>

## 🧰 Qué trae

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/moodle-mcp@0.4.0`, con las herramientas de alumno y tus ajustes |
| 🔎 `read-a-course` | Secciones, recursos y actividades, qué está bloqueado y por qué, qué cuenta como hecho |
| 🗓️ `plan-my-work` | Lo que queda, las fechas de entrega y de corte, qué desbloquea qué, en un orden realista |
| 📤 `hand-in-an-assignment` | Qué admite, guardar, comprobar y enviar definitivamente, la declaración de autoría |
| 📝 `take-a-quiz` | Las reglas antes de empezar, responder cada tipo de pregunta, enviar, la revisión |
| 💬 `forums` | Leer los hilos, preguntar donde corresponde, publicar una sola vez, escribir al docente |
| 🧩 `other-activities` | Consultas, encuestas, lecciones, SCORM, H5P, talleres (entregar y evaluar a compañeros), entradas de glosario, wiki y base de datos, insignias y finalización manual |
| 📊 `grades-and-feedback` | El informe de calificaciones, la retroalimentación de cada actividad y lo que falta por corregir |
| 🌐 `several-sites` | Añadir sitios y cambiar de uno a otro, por separado |
| 📅 `week` | Lo que tienes que hacer esta semana, en orden (en Claude Code, también `/moodle-student:week`) |

## 📚 Documentación

- **[Documentación de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/)**: qué hace el servidor, el inicio de sesión, la privacidad y los límites.
- **[Herramientas de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/reference/tools)**: todas, con los roles que las tienen.
- **[Installing extensions](https://falkenslab.github.io/agent-kit/docs/extensions/installing)** (en inglés): en un agente hecho con agent-kit.

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code: `.claude-plugin/plugin.json` (sus ajustes en `userConfig`, los datos de agent-kit en `metadata["agent-kit"]`), `.mcp.json` y `skills/`. Para probar un cambio, enlázala en un agente en vez de instalarla (`my-agent extension add ./extensions/moodle-student --link`) y compruébala con `claude plugin validate --strict extensions/moodle-student`. Cómo la ejecuta agent-kit: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
