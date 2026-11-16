---
name: video-understanding
description: Find out what a video says and shows with the video server - its captions first (YouTube's tracks, a .vtt or .srt, a file's own subtitles) with get_captions, a transcription with faster-whisper only when it has none, and frames where the screen changes for slides, code and windows - matched by time, quoted with their times, and long videos read a page or a stretch at a time. Use when the person asks what a video or lecture says, to summarize it, find where something is said or shown, list its chapters, read the code or slides in it, or check which videos have subtitles.
---

# Understanding a video

The video server works on this computer: a video is a file here or an address (YouTube, or another site yt-dlp reads). Nothing is uploaded anywhere. Chapters, summaries and answers are yours to write from what the tools return; no tool writes them.

## Getting the video

- **A file on this computer**: give its absolute path.
- **YouTube or another public site**: give the address; the tools read it with yt-dlp, and download the audio or the picture only when transcribing or taking frames.
- **A video on a Moodle site** (a file in a course, `…/pluginfile.php/…`): it needs the person's sign-in, which this server doesn't have. Download it first with moodle-mcp's `download_file` (moodle-teacher or moodle-student) and give the path it saved. A video embedded from YouTube in a Moodle page is the YouTube address.
- A site that needs a sign-in, a private video or a live stream: say yt-dlp can't read it, and ask the person for the file.

## What it says: captions first

1. **`get_video_info`**: its title, length, chapters, and the captions it has. `hasCaptions` false is a video with no subtitles at all.
2. **`get_captions`** when it has some: instant, and usually better than a transcription. It chooses someone's own captions in the language asked for (`language`, else the setting, else the video's own), then YouTube's automatic ones, then a machine translation of those; `kind` says which it got, and `track` or `stream` picks another from `get_video_info`'s list. A `.vtt` or `.srt` file or address reads the same way, with nothing installed.
3. **`transcribe_video`** only when `get_captions` says `found: false`. Say it first: it takes about a third of the video's length on a laptop with the default model (an hour of video, some twenty minutes), more with a bigger `model`, and the first use of a model downloads it once. Give the `language` when it's known: it's faster and better than detecting it; a low `languageProbability` means the detection may be wrong. For a long video, `from` and `to` transcribe only the part that matters.

Both return the transcript as paragraphs, `[mm:ss] text`, a page at a time: when there's a `next`, call again with `offset: next` for the rest (a transcription is kept, so the next page doesn't transcribe again). Read every page before summarizing the whole video.

Automatic captions and transcriptions mishear names, technical terms and code: correct what you're sure of from the context, say so when quoting them, and never present a guess as what was said. Automatic captions have little punctuation; translated ones are machine translations.

## What it shows: frames

When what's on screen matters (slides, code, a program's windows, the board, a diagram), **`extract_frames`** saves frames as JPEG files, each with its time; open them with your image reading tool.

- `scenes` mode (the default) takes one where the picture changes, plus one at least every `every` seconds (120 by default). Lower the `threshold` (0.1) to catch small changes such as code being typed; raise it (0.5) for only new slides or shots.
- `interval` mode takes one every `every` seconds (30 by default): for a video whose changes are gradual, such as someone writing on a board.
- At most `maxFrames` (40 by default) are kept, spread over the video, and the notes say when more were found: for a long video, ask for the stretch that matters with `from` and `to` instead of raising the limit.
- Match each frame with the transcript by its time (`at` is `mm:ss`, as the transcript shows it). Read text on screen carefully: code in a frame may be cut off or blurred; say so rather than filling it in.

## Answering

- Quote times as `mm:ss` so the person can jump there; use the video's own chapters when it has them.
- Tell what the video says from what you infer, and what the captions or the transcription say from what you saw in a frame.
- For several videos ("which of these have no subtitles?"), `get_video_info` on each is enough: it doesn't download them.

## When something fails

- A tool that needs a program that isn't installed fails saying which and how to install it on this system. Never install anything yourself: tell the person, and that the app may need restarting afterwards. `check_requirements` reports all three (ffmpeg, Python with faster-whisper, yt-dlp); reading a `.vtt` or `.srt` needs none.
- yt-dlp fails when YouTube changes: an old yt-dlp is the usual cause, and updating it (the same install command) the usual fix.
- `server_info` gives the work folder, where each video has its own folder with its downloads, transcripts and frames, and the settings.
