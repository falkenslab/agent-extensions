/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them.
 * Generic: no client, agent or institution is named here.
 */
export const INSTRUCTIONS = `- This server reads videos on this computer: what's said (captions, or a transcription) and what's shown (frames). Everything runs locally; nothing is uploaded anywhere.
- What's said: get_video_info, then get_captions when the video has captions; transcribe_video only when it has none (it's slow). Automatic captions and transcriptions mishear names and terms: say so when quoting them.
- What's shown: extract_frames, then look at the frames that matter, matching them with the transcript by time.
- Subtitles for a video: transcribe_video, agree corrections with the person, then write_subtitles to a .vtt they choose.
- A video on a site that needs signing in (Moodle) is downloaded first with that site's own tools, and given here as a file.
- Tools annotated read-only only read; the others write only in the work folder, except write_subtitles. check_requirements says how to install ffmpeg, faster-whisper or yt-dlp when one is missing: never install anything yourself. server_info helps when something fails.`;
