<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/video/assets/logo.svg" alt="Logo de la extensión video: un fotograma con un botón de reproducir sobre dos líneas de subtítulos" width="112"/>

# video

**Tu agente de IA entiende un vídeo y escribe sus subtítulos, en tu ordenador.**<br/>
Sus subtítulos leídos como una transcripción con tiempos, el habla transcrita cuando no los tiene, fotogramas donde cambia la pantalla y subtítulos WebVTT listos para subir con el vídeo, a través de video-mcp.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 video-mcp](../../mcps/video/)** · [🇬🇧 Read in English](README.md)

</div>

Esta extensión da a un agente hecho con [agent-kit](https://github.com/falkenslab/agent-kit) o a Claude Code el servidor [video-mcp](../../mcps/video/) y lo que hay que saber para usarlo bien: leer antes que nada los subtítulos que ya tiene un vídeo (los de YouTube, un `.vtt` o `.srt`, o los del propio archivo), transcribir su habla en tu ordenador con [faster-whisper](https://github.com/SYSTRAN/faster-whisper) solo cuando no los tiene, sacar fotogramas donde cambia la pantalla para ver las diapositivas y el código, y escribir un archivo de subtítulos `.vtt` a partir de una transcripción que has corregido, para el reproductor de Moodle. Trabaja con archivos de tu ordenador y con YouTube u otros sitios públicos a través de [yt-dlp](https://github.com/yt-dlp/yt-dlp); un vídeo de un curso de Moodle se descarga antes con [moodle-teacher](../moodle-teacher/) o [moodle-student](../moodle-student/). Sabe de vídeos y sus formatos, no de enseñar ni de estudiar: un agente que sí sabe, como [miyagi](https://github.com/falkenslab/miyagi) o [padawan](https://github.com/falkenslab/padawan), la instala.

## ✨ Por qué esta extensión

- 💬 **Primero los subtítulos.** Los subtítulos del propio vídeo son inmediatos y suelen ser mejores que una transcripción; el agente solo transcribe lo que no los tiene.
- 🔒 **En tu ordenador.** La transcripción y los fotogramas se hacen aquí; ningún vídeo, audio o imagen se envía a ningún servicio.
- 🖼️ **También lo que se ve.** Fotogramas donde cambia una diapositiva, se abre otra ventana o se escribe código, cada uno con su tiempo, para cruzarlos con lo que se dice.
- ♿ **Subtítulos que el reproductor acepta.** WebVTT en orden, dos líneas cortas cada vez, con los nombres y términos que la transcripción entendió mal corregidos contigo.
- 🧰 **Tu ordenador lo decides tú.** ffmpeg, faster-whisper y yt-dlp los instalas tú: el agente los comprueba y te dice el comando para tu sistema, y nunca instala nada.

## 🚀 Empezar

Necesitas [Node.js](https://nodejs.org) 20 o posterior, un agente con agent-kit o Claude Code 2.1.271 o posterior y, para lo que los necesita, [ffmpeg](https://ffmpeg.org/download.html) (fotogramas), [faster-whisper](https://github.com/SYSTRAN/faster-whisper#installation) (transcribir; lee el vídeo él mismo, sin ffmpeg) y [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) (YouTube y otros sitios). Leer un `.vtt` o `.srt` no necesita ninguno.

```bash
# Lo que usa (Windows; macOS: brew install ffmpeg yt-dlp; Linux: sudo apt install ffmpeg, pipx install yt-dlp)
winget install Gyan.FFmpeg
winget install yt-dlp.yt-dlp
py -m pip install faster-whisper

# Un agente hecho con agent-kit (su propio comando)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add video@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install video@falkenslab
```

Pregunta, todo opcional, por una carpeta de trabajo (donde van las descargas, las transcripciones y los fotogramas), el modelo de transcripción (`small` por defecto), el idioma habitual de tus vídeos y, cuando faster-whisper está en un entorno virtual (como hace falta en macOS y Linux), el Python de ese entorno. Reinicia la aplicación si instalaste un programa con ella abierta; el agente los comprueba con `check_requirements`. Luego pide: «¿Qué dice este vídeo sobre las rutas estáticas? https://www.youtube.com/watch?v=…». En Codex, que no tiene ajustes, usa los valores por defecto, y el idioma se lo puedes decir en el chat.

## 💬 Qué puedes pedir

- 🧑‍🎓 «Resúmeme esta clase con sus capítulos y el código que enseña.»
- 🧑‍🎓 «¿En qué minuto explica el profesor la recursividad en este vídeo?»
- 👩‍🏫 «Hazme subtítulos en español para mi vídeo clase.mp4, listos para subir a Moodle.»
- 👩‍🏫 «¿Cuáles de los vídeos de esta lista no tienen subtítulos?»
- 👩‍🏫 «Convierte este .srt en un .vtt para Moodle.»

## 🧰 Qué incluye

| Parte | Qué es |
| --- | --- |
| 🔌 Servidor | `npx -y @falkenslab/video-mcp@0.1.0` ([video-mcp](../../mcps/video/)): `get_video_info`, `get_captions`, `transcribe_video`, `extract_frames`, `write_subtitles`, `clean_up_video`, `check_requirements`, `server_info` |
| 🧩 `video-understanding` | Qué dice y qué muestra un vídeo: conseguirlo (un archivo, YouTube, un archivo de Moodle descargado antes), primero los subtítulos, una transcripción solo cuando no los tiene, fotogramas donde cambia la pantalla, los vídeos largos por páginas o por tramos, y citar con tiempos |
| 🧩 `video-subtitles` | Un `.vtt` para un vídeo: transcribirlo, revisar la transcripción y acordar las correcciones con la persona, escribirlo y dónde va en Moodle; también convertir un `.srt` |
| 🤖 `video-transcriber` | Subagente: convierte un vídeo en un documento Markdown con lo que se dice y lo que se ve, tramo a tramo y en orden, con sus fotogramas descritos y sus términos corregidos, y luego limpia las descargas; para `video-understanding` con vídeos largos o varios |

## 🎯 Capacidades y lo que necesitan

| Capacidad | Qué permite al agente | Necesita |
| --- | --- | --- |
| `video-captions` | Leer los subtítulos de un vídeo, y saber qué vídeos no tienen | Nada para un `.vtt` o `.srt`; ffmpeg para los de un archivo de vídeo |
| `video-transcription` | Transcribir el habla de un vídeo | Python con faster-whisper |
| `video-visual` | Sacar fotogramas donde cambia la pantalla | ffmpeg |
| `video-online` | Trabajar con YouTube y otros sitios por su dirección | yt-dlp |
| `subtitles` | Escribir un `.vtt` a partir de una transcripción, un `.srt` o cues | Nada |

Un agente con agent-kit mantiene lo que este ordenador puede hacer y te dice qué instalar para lo demás.

## 📚 Documentación

- **[video-mcp](../../mcps/video/)**: el servidor, en este repositorio (en inglés): sus herramientas, sus ajustes y cómo funcionan la transcripción, los fotogramas y YouTube.
- **[Escribir una extensión instalable](https://falkenslab.github.io/agent-kit/es/docs/extensions/writing)**: cómo ejecuta agent-kit una extensión y comprueba lo que necesita.

## 🛠️ Desarrollo

La extensión es un plugin de Claude Code: `.claude-plugin/plugin.json` (los datos de agent-kit en `metadata["agent-kit"]`), `.mcp.json` y `skills/`. El código del servidor está en [`mcps/video/`](../../mcps/video/), publicado en npm como `@falkenslab/video-mcp`, que `.mcp.json` ejecuta con `npx` en una versión fija. Para probar un cambio, enlázala en un agente (`my-agent extension add ./extensions/video --link`) y compruébala con `claude plugin validate --strict extensions/video`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
