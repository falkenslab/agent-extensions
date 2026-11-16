---
name: video-subtitles
description: Make a WebVTT subtitle file (.vtt) for a video with the video server - transcribe it with transcribe_video, review the transcript with the person and agree the corrections (names, terms, code), write it with write_subtitles, and hand it over to upload with the video to Moodle; also convert an .srt to .vtt or tidy an existing one. Use when the person asks for subtitles or captions for their own video, to make a video accessible, or to turn a transcript or an .srt into a .vtt.
---

# Making subtitles for a video

Subtitles are a `.vtt` file (WebVTT), the format Moodle's media player and browsers take as a video's captions track. They're made on this computer from the video's speech, and the person reviews them before they're used: a transcription is never perfect.

## Steps

1. **Check the video has none already**: `get_video_info`. A YouTube video with its own captions doesn't need a file (YouTube shows them); a file with text subtitle streams can be converted instead of transcribed (`get_captions` reads them, then `write_subtitles` with `cues`).
2. **Transcribe it**: `transcribe_video` with the video and its `language`. Say first that it takes a while (about a third of the video's length with the default model) and that `model: "medium"` or `"large-v3"` is better for difficult audio but much slower. The result's `transcript` is the path of the kept transcript.
3. **Review it with the person**: show the transcript (every page, `next`) and list what looks misheard: names of people and places, technical terms, code, numbers, words in another language. Propose the corrections as pairs (`"get hub"` → `"GitHub"`) and let the person confirm or add to them. Whole cues that are wrong are fixed by giving `cues` instead (below).
4. **Write it**: `write_subtitles` with `from` (the transcript's path), `outputPath` and the agreed `corrections`. Write it where the person says, usually beside the video with its name (`lesson.mp4` → `lesson.vtt`), and say where before writing. It never overwrites a file unless `overwrite: true`, which only goes with the person's yes.
5. **Hand it over**: its path, how many subtitles, the notes on what was tidied, and the preview of the first ones.

## What write_subtitles does to them

It puts them in order, cuts overlaps where the next one starts, drops empty ones, keeps each on screen at least half a second, and wraps the text into at most two balanced lines of 42 characters (`maxLines`, `maxLineLength`), splitting a long cue into several and sharing its time. Corrections are whole words or phrases, ignoring case, in every cue.

- From a `.srt` or a `.vtt` (`from`): it converts or tidies it the same way.
- From `cues` (`start`, `end` in seconds, `text`): for a short video, a cue the person rewrote, or captions read with `get_captions`. Keep the times the transcript gave; don't invent them.

## Putting it in Moodle

Subtitles go with the video file in Moodle's media player: in the text editor's media dialog (Insert media → Video → Subtitles and captions), the `.vtt` is added as a track with its language. That's the person's step, or moodle-teacher's when it has a tool for it; this server uploads nothing. A video embedded from YouTube takes its subtitles in YouTube Studio, not in Moodle.
