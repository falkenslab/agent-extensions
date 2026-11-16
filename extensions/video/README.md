<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/video/assets/logo.svg" alt="video extension logo: a video frame with a play button above two lines of subtitles" width="112"/>

# video

**Your AI agent understands a video and writes its subtitles, on your computer.**<br/>
Its captions read as a timed transcript, the speech transcribed when it has none, frames where the screen changes, and WebVTT subtitles ready to upload with the video, through video-mcp.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![agent-kit extension](https://img.shields.io/badge/agent--kit-extension-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

**[📖 video-mcp](../../mcps/video/)** · [🇪🇸 Leer en español](README.es.md)

</div>

This extension gives an agent built on [agent-kit](https://github.com/falkenslab/agent-kit) or Claude Code the [video-mcp](../../mcps/video/) server and what to know to use it well: reading a video's captions before anything else (YouTube's, a `.vtt` or `.srt`, or a file's own), transcribing its speech on your computer with [faster-whisper](https://github.com/SYSTRAN/faster-whisper) only when it has none, taking frames where the screen changes to see the slides and the code, and writing a `.vtt` subtitle file from a transcription you've corrected, for Moodle's media player. It works with files on your computer and with YouTube or other public sites through [yt-dlp](https://github.com/yt-dlp/yt-dlp); a video in a Moodle course is downloaded first with [moodle-teacher](../moodle-teacher/) or [moodle-student](../moodle-student/). It knows videos and their formats, not teaching or studying: an agent that does, like [miyagi](https://github.com/falkenslab/miyagi) or [padawan](https://github.com/falkenslab/padawan), installs it.

## ✨ Why this extension

- 💬 **Captions first.** A video's own captions are instant and usually better than a transcription; the agent transcribes only what has none.
- 🔒 **On your computer.** The transcription and the frames are made here; no video, audio or image is sent to any service.
- 🖼️ **What's on screen too.** Frames where a slide changes, another window opens or code is written, each with its time, to match with what's said.
- ♿ **Subtitles a player takes.** WebVTT in order, two short lines at a time, with the names and terms the transcription misheard corrected with you.
- 🧰 **You stay in charge of your computer.** ffmpeg, faster-whisper and yt-dlp are yours to install: the agent checks them and tells you the command for your system, and never installs anything.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later, an agent on agent-kit or Claude Code 2.1.271 or later, and, for what needs them, [ffmpeg](https://ffmpeg.org/download.html) (transcribing and frames), [faster-whisper](https://github.com/SYSTRAN/faster-whisper#installation) (transcribing) and [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) (YouTube and other sites). Reading a `.vtt` or `.srt` needs none of them.

```bash
# What it uses (Windows; macOS: brew install ffmpeg yt-dlp; Linux: sudo apt install ffmpeg, pipx install yt-dlp)
winget install Gyan.FFmpeg
winget install yt-dlp.yt-dlp
py -m pip install faster-whisper

# An agent built on agent-kit (its own command)
my-agent extension marketplace add falkenslab/agent-extensions
my-agent extension add video@falkenslab

# Claude Code
claude plugin marketplace add falkenslab/agent-extensions
claude plugin install video@falkenslab
```

It asks, all optional, for a work folder (where downloads, transcripts and frames go), the transcription model (`small` by default), your videos' usual language and, when faster-whisper is in a virtual environment (as macOS and Linux need), that environment's Python. Restart the app if you installed a program while it was open; the agent checks them with `check_requirements`. Then ask: "What does this video say about static routes? https://www.youtube.com/watch?v=…" Codex doesn't run it yet: it runs the server from its folder, which Codex can't, until it's published to npm.

## 💬 What you can ask

- 🧑‍🎓 "Summarize this lecture with its chapters, and the code it shows."
- 🧑‍🎓 "When does the teacher explain recursion in this video?"
- 👩‍🏫 "Make Spanish subtitles for my video lesson.mp4, ready to upload to Moodle."
- 👩‍🏫 "Which of the videos in this list have no subtitles?"
- 👩‍🏫 "Turn this .srt into a .vtt for Moodle."

## 🧰 What's inside

| Part | What it is |
| --- | --- |
| 🔌 Server | `node dist/server.mjs` ([video-mcp](../../mcps/video/) 0.1.0, bundled until it's on npm): `get_video_info`, `get_captions`, `transcribe_video`, `extract_frames`, `write_subtitles`, `check_requirements`, `server_info` |
| 🧩 `video-understanding` | What a video says and shows: getting it (a file, YouTube, a Moodle file downloaded first), captions first, a transcription only when it has none, frames where the screen changes, long videos a page or a stretch at a time, and quoting with times |
| 🧩 `video-subtitles` | A `.vtt` for a video: transcribing it, reviewing the transcript and agreeing corrections with the person, writing it, and where it goes in Moodle; also converting an `.srt` |

## 🎯 Capabilities and what they need

| Capability | What it lets the agent do | Needs |
| --- | --- | --- |
| `video-captions` | Read the captions a video has, and tell which videos have none | Nothing for a `.vtt` or `.srt`; ffmpeg for a video file's own |
| `video-transcription` | Transcribe a video's speech | ffmpeg and Python with faster-whisper |
| `video-visual` | Take frames where the screen changes | ffmpeg |
| `video-online` | Work with YouTube and other sites by address | yt-dlp |
| `subtitles` | Write a `.vtt` from a transcript, an `.srt` or cues | Nothing |

An agent on agent-kit keeps on what this computer can do and tells you what to install for the rest.

## 📚 Documentation

- **[video-mcp](../../mcps/video/)**: the server, in this repository: its tools, settings, and how the transcription, the frames and YouTube work.
- **[Writing an installable extension](https://falkenslab.github.io/agent-kit/docs/extensions/writing)**: how agent-kit runs an extension and checks what it requires.

## 🛠️ Developing

The extension is a Claude Code plugin: `.claude-plugin/plugin.json` (agent-kit's data in `metadata["agent-kit"]`), `.mcp.json` and `skills/`. The server's code is in [`mcps/video/`](../../mcps/video/); until it's published to npm as `@falkenslab/video-mcp`, its build copies `dist/server.mjs` here, committed, which `.mcp.json` runs with `node`. To try a change, link the extension into an agent (`my-agent extension add ./extensions/video --link`) and check it with `claude plugin validate --strict extensions/video`.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
