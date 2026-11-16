<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-extensions/main/extensions/video/assets/logo.svg" alt="video-mcp logo: a video frame with a play button above two lines of subtitles" width="112"/>

# video-mcp

**Your AI agent understands a video and writes its subtitles, on your computer.**<br/>
Its captions read as a timed transcript, or the speech transcribed with faster-whisper when it has none, frames where the screen changes, and a WebVTT file ready to upload.

![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![MCP server](https://img.shields.io/badge/MCP-server-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](../../LICENSE)

</div>

video-mcp is an MCP server that lets an AI agent work with a video: a file on your computer, a YouTube video or another site's. It reads the captions the video already has (YouTube's, a `.vtt` or `.srt`, or a file's own), transcribes the speech when there are none, takes frames where the picture changes so the agent can look at the slides or the code on screen, and writes a `.vtt` subtitle file from a transcript, which Moodle and browsers take as a captions track. Everything runs on your computer with programs you install yourself (ffmpeg, faster-whisper, yt-dlp); nothing is uploaded. It's the server of Falken's Lab's [video extension](../../extensions/video/), which adds the skills that say how an agent uses it well.

## ✨ Why video-mcp

- 💬 **Captions first.** A video's own captions are instant and usually better than a transcription: the agent reads them before transcribing anything.
- 🎙️ **Transcription on your computer.** faster-whisper, with the model size you choose, on the CPU; the audio never leaves your computer.
- 🖼️ **What's on screen.** Frames where a slide changes, another window opens or code is written, each with its time, to match with what's said.
- 📝 **Subtitles a player takes.** WebVTT in order, never overlapping, two short lines each, with misheard names corrected throughout.
- 🧰 **Nothing installed for you.** `check_requirements` says what's missing and the command for your system; a tool that needs a missing program says the same.

## 🚀 Quick start

With [Node.js](https://nodejs.org) 20 or later and the programs you need ([ffmpeg](https://ffmpeg.org/download.html) for frames, [faster-whisper](https://github.com/SYSTRAN/faster-whisper#installation) for transcribing, [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) for YouTube), add it to Claude Code:

```bash
claude mcp add video-mcp -- npx -y @falkenslab/video-mcp
```

Then ask about a video. In an agent built on agent-kit, or in Claude Code with its skills, install the [video extension](../../extensions/video/) instead.

## 💬 What you can ask

👩‍🏫 As a teacher:

- "Make Spanish subtitles for my video lesson.mp4, ready to upload to Moodle."
- "Which of these YouTube videos have no subtitles?"

🧑‍🎓 As a student:

- "Summarize this video lecture with its chapters, and the code it shows."
- "What does the teacher say about static routes in this video, and when?"

## 🧰 What's inside

| Tool | What it does |
| --- | --- |
| `get_video_info` | A video's title, length, picture, sound, chapters and the captions it has (YouTube's tracks or a file's subtitle streams); only reads |
| `get_captions` | Its captions as a timed transcript, a page at a time: YouTube's (someone's, automatic or translated), a `.vtt` or `.srt` file or address, or a file's own; only reads |
| `transcribe_video` | The speech as a timed transcript when there are no captions: faster-whisper reads the video and transcribes it, without ffmpeg; kept as JSON for the next page and for subtitles |
| `extract_frames` | Frames where the picture changes, or at an interval, as JPEG files with their times |
| `write_subtitles` | A `.vtt` from a transcript, a `.srt` or `.vtt`, or cues, tidied as subtitles, with corrections |
| `clean_up_video` | Deletes what was kept for a video once it's done with: its downloads and frames, and its transcripts if asked; never the person's own file |
| `check_requirements` | ffmpeg, Python with faster-whisper and yt-dlp: found or not, their versions and how to install each; only reads |
| `server_info` | The version, the settings and the programs found; only reads |

## ⚙️ Settings

Environment variables, all optional; one left as an unexpanded `${user_config.*}` counts as not set:

| Variable | What it sets |
| --- | --- |
| `VIDEO_MCP_WORK_DIR` | Where downloads, transcripts and frames go, a folder per video (by default the extension's data folder, else `~/.video-mcp`) |
| `VIDEO_MCP_WHISPER_MODEL` | faster-whisper's model: `tiny`, `base`, `small` (the default), `medium`, `large-v3` or `turbo` |
| `VIDEO_MCP_LANGUAGE` | The videos' usual language (`es`, `en`…), for captions and transcription; detected when not set |
| `VIDEO_MCP_PYTHON` | The Python with faster-whisper, when it isn't the one on the PATH (a virtual environment's) |
| `VIDEO_MCP_WHISPER_DEVICE` | `cpu` (the default), `cuda` or `auto` |

## 🔧 How it works

- **Programs, never a shell.** ffmpeg, ffprobe and yt-dlp are found on the PATH (yt-dlp also as `python -m yt_dlp`), and run with an argument list. Python is `VIDEO_MCP_PYTHON`, else the first `python3` or `python` on the PATH (`python`, then `py -3` on Windows, skipping the Microsoft Store's stubs) that has faster-whisper.
- **Transcription.** A short Python script passed with `-c` has faster-whisper read the video (or its downloaded audio) itself, through the PyAV it brings, as padawan does, so ffmpeg isn't needed; it cuts the stretch asked for and runs faster-whisper (int8, voice activity detection to skip silences), printing a JSON line per segment, which the server reads as it comes and reports as progress. The transcript is kept as `transcript-<model>-<language>.json` in the video's folder. `clean_up_video` deletes the downloads and frames afterwards.
- **Frames.** One ffmpeg pass with a `select` filter: the first frame, a frame where the scene score passes the threshold (but not within 2 seconds of the last), and one at least every `every` seconds; `showinfo` gives each frame's time. Over `maxFrames`, an even spread is kept.
- **YouTube.** yt-dlp reads the video's details and captions tracks (`-J`) and downloads the chosen track as WebVTT; YouTube's rolling automatic captions are read once each. To transcribe or take frames, it downloads the audio alone, or the picture alone up to 1080p, into the video's folder, where they're reused.

## 🛠️ Developing

In this folder: `npm install`, then `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (one file, `dist/server.mjs`, with esbuild) and `npm run check` (the built server's tools, complete). The tests fake ffmpeg, ffprobe, yt-dlp and Python (`test/fake.ts`), so they need none of them. `npm publish` runs all the checks first; releases are published to npm by the owner.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
