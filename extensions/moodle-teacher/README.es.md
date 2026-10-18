<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/moodle-mcp/main/docs/static/img/logo.svg" alt="Logo de moodle-mcp: la m de Moodle enchufada a una toma de corriente" width="112"/>

# moodle-teacher

**Tu agente de IA trabaja en los cursos de Moodle que impartes, como tú, y sabe hacerlo bien.**<br/>
Las herramientas de profesor de moodle-mcp, con las buenas prácticas para crear, corregir, seguir y reutilizar tus cursos.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
![Moodle 4.5 y 5.x](https://img.shields.io/badge/Moodle-4.5%20%7C%205.x-f98012?logo=moodle&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 Documentación de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión, para docentes, da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit), o a Claude Code, el servidor [moodle-mcp](https://github.com/falkenslab/moodle-mcp) y lo que hay que saber para usarlo: skills para todo lo que tiene un curso (contenidos, tareas, cuestionarios, foros, otras actividades, el libro de calificaciones), para corregir, seguir a la clase y revisar un curso, para publicar con seguridad y para reutilizar cursos entre sitios, y skills para ver de un vistazo lo pendiente. Sabe de Moodle, no de enseñar: un agente que sabe enseñar, como [miyagi](https://github.com/falkenslab/miyagi), la instala para trabajar en Moodle. Para los cursos en los que eres alumno está [moodle-student](../moodle-student/README.es.md). Ejecuta moodle-mcp desde npm, a una versión fija, con un navegador real en tu ordenador y con tu sesión.

## ✨ Por qué esta extensión

- 🧭 **Buenas prácticas, no solo herramientas.** Sus skills dicen qué herramienta usar para cada tarea, en qué orden y qué comprobar después.
- 🔐 **Tu sesión, nunca tu contraseña.** Entras tú, en una ventana del navegador que abre moodle-mcp.
- 🕶️ **El alumnado sigue siendo anónimo.** Llega al agente con alias, salvo que elijas otra cosa.
- 🎚️ **Tú pones los límites al instalarla.** Acceso de solo lectura, y cómo llegan los datos del alumnado.
- ✋ **Pregunta antes de cambiar nada.** En modo plan solo lee; si no, confirma contigo cada cambio.
- 🌐 **Varios sitios Moodle.** El de tu centro y el de tu universidad, y contenidos copiados de uno a otro.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, y un agente con agent-kit 0.22 o posterior, o Claude Code 2.1.271 o posterior.

```bash
# Un agente hecho con agent-kit (con su propio comando; el del Capitán Bigotes: npm start --)
my-agent extension marketplace add falkenslab/agent-kit-extensions
my-agent extension add moodle-teacher@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-kit-extensions
claude plugin install moodle-teacher@falkenslab
```

Los dos piden sus ajustes al instalarla: tus sitios Moodle (`nombre=dirección`, por ejemplo `centro=https://campus.micentro.org`) y los opcionales de abajo. La primera vez que trabaja en un sitio se abre una ventana del navegador para que entres.

Codex también la instala (`codex plugin marketplace add falkenslab/agent-kit-extensions` y luego `codex plugin add moodle-teacher@falkenslab`), con sus skills y su servidor. Codex no tiene ajustes de plugins, así que la primera vez el agente te pide en el chat la dirección de tu Moodle. Codex guarda un servidor por nombre y las dos extensiones de Moodle llaman al suyo `moodle`, así que activa solo una de `moodle-teacher` y `moodle-student` en él.

## ⚙️ Ajustes

| Ajuste | Qué hace | Por defecto |
| --- | --- | --- |
| `sites` | Tus sitios Moodle, cada uno como `nombre=dirección`; empieza por el primero | obligatorio |
| `headless` | El navegador trabaja sin verse (se abre una ventana para entrar, o si pides mirar) | sí |
| `access` | `read`: solo mirar, sin cambiar nada | `write` |
| `student_data` | `pseudonymize` (alias), `block` (nada) o `clear` (nombres: solo para una IA que funcione en tu propio ordenador) | `pseudonymize` |

Cámbialos después con `my-agent extension config moodle-teacher`, en el chat con `/extensions config moodle-teacher`, en los ajustes de extensiones de un agente de escritorio o en el `/plugin` de Claude Code. Los sitios que añadas luego pidiéndolo («añade el Moodle de mi universidad») los guarda moodle-mcp, aparte de estos.

## 💬 Qué puedes pedirle

- 👩‍🏫 «Corrige las redacciones del tema 3 con su rúbrica y enséñame antes las propuestas.»
- 👩‍🏫 «Haz un cuestionario de 10 preguntas sobre fracciones con el banco de preguntas del curso.»
- 👩‍🏫 «Copia el tema 2 del año pasado del Moodle de mi antiguo centro al curso de este año.»
- 👩‍🏫 «¿Quién se está quedando atrás en el tema 3, y en qué actividad?»
- 👩‍🏫 «Revisa que el curso esté listo para el nuevo trimestre: fechas, actividades bloqueadas, el libro de calificaciones.»
- 👩‍🏫 «/moodle-teacher:to-grade» o «/moodle-teacher:week»: lo que espera corrección y lo que vence.

## 📸 Míralo en acción

<p align="center">
<img src="https://raw.githubusercontent.com/falkenslab/agent-kit-extensions/main/extensions/moodle-teacher/assets/screenshot.png" alt="La rúbrica de una tarea de Moodle, lista para usar, que el agente definió con set_rubric" width="760"/>
</p>

<p align="center"><em>En moodle-sandbox: la rúbrica que Claude Code definió para una tarea nueva, tras proponerla y preguntar antes.</em></p>

## 🧰 Qué trae

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/moodle-mcp@0.4.0`, con tus ajustes |
| 🔎 `read-a-course` | Lo que la persona puede hacer en un curso, su estructura, restricciones, finalización y fechas |
| 🫥 `publishing` | Lo nuevo, primero oculto, comprobado y luego visible; una aprobación por cada cosa |
| 📄 `course-content` | Páginas, libros con sus capítulos, archivos, carpetas, enlaces y textos de sección, en un HTML comprobado antes de llegar a Moodle |
| 📤 `assignments` | Ajustes de entrega que encajan con el enunciado, fechas, grupos, retroalimentación, y su rúbrica o guía de calificación |
| 📝 `quizzes` | Ajustes según el propósito del cuestionario, GIFT comprobado antes de importarlo, bancos exportados para reutilizarlos, orden y total |
| 🧩 `other-activities` | Taller y su asignación, páginas y saltos de lección, base de datos, glosario, wiki, encuesta, foros, consulta, H5P; finalización, restricciones, grupos e insignias |
| 💬 `forums` | Leer los hilos, publicar una sola vez, avisos y moderación |
| ✅ `grading` | Tareas con su rúbrica, preguntas de ensayo y foros calificados, con propuestas antes |
| 🧮 `gradebook` | Categorías, agregación y pesos que calculan el sistema de calificación |
| 📈 `class-progress` | Finalización, notas, entregas y actividad, y escribir a quien se queda atrás |
| 🩺 `course-check` | Lo que está roto o desfasado en un curso, y prepararlo para una nueva edición |
| 🎮 `scorm` | Una actividad HTML empaquetada como SCORM, subida y probada para que Moodle la registre |
| 📦 `copy-and-restore` | Copiar, importar, hacer copias de seguridad y restaurar cursos, y comprobar el resultado |
| 🌐 `several-sites` | Añadir sitios, cambiar de uno a otro y copiar entre ellos |
| 📅 `week` | Lo que vence esta semana y lo que te espera (en Claude Code, también `/moodle-teacher:week`) |
| 🗂️ `to-grade` | Lo que espera corrección, curso a curso (en Claude Code, también `/moodle-teacher:to-grade`) |

## 📚 Documentación

- **[Documentación de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/)**: qué hace el servidor, el inicio de sesión, la privacidad y los límites.
- **[Herramientas de moodle-mcp](https://falkenslab.github.io/moodle-mcp/es/reference/tools)**: todas, con los roles que las tienen.
- **[Installing extensions](https://falkenslab.github.io/agent-kit/docs/extensions/installing)** (en inglés): en un agente hecho con agent-kit.

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code: `.claude-plugin/plugin.json` (sus ajustes en `userConfig`, los datos de agent-kit en `metadata["agent-kit"]`), `.mcp.json` y `skills/`. Para probar un cambio, enlázala en un agente en vez de instalarla (`my-agent extension add ./extensions/moodle-teacher --link`) y compruébala con `claude plugin validate --strict extensions/moodle-teacher`. Cómo la ejecuta agent-kit: [Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing).

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
