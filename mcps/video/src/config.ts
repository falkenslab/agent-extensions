// The server's settings, read through setting() (an unexpanded ${user_config.*} counts as not set).
import { homedir } from "node:os";
import path from "node:path";
import { setting } from "./settings.js";
import { COMMAND } from "./version.js";

/** faster-whisper's model sizes: bigger is better and slower. */
export const MODELS = ["tiny", "base", "small", "medium", "large-v3", "turbo"] as const;
export type Model = (typeof MODELS)[number];

/** The folder for downloads, transcripts and frames: VIDEO_MCP_WORK_DIR, else the extension's data folder, else ~/.video-mcp. */
export function workDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured = setting("VIDEO_MCP_WORK_DIR", env);
  if (configured) return path.resolve(configured.replace(/^~(?=$|[\\/])/, homedir()));
  const data = setting("CLAUDE_PLUGIN_DATA", env);
  return path.resolve(data ? path.join(data, "work") : path.join(homedir(), `.${COMMAND}`));
}

/** faster-whisper's model: VIDEO_MCP_WHISPER_MODEL, else small, a good balance on a laptop's CPU. */
export function whisperModel(env: NodeJS.ProcessEnv = process.env): string {
  return setting("VIDEO_MCP_WHISPER_MODEL", env) ?? "small";
}

/** The videos' usual language (es, en…): VIDEO_MCP_LANGUAGE, else undefined (detected). */
export function defaultLanguage(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = setting("VIDEO_MCP_LANGUAGE", env)?.toLowerCase();
  return value && value !== "auto" ? value : undefined;
}

/** Where faster-whisper runs: VIDEO_MCP_WHISPER_DEVICE (cpu, cuda, auto), else cpu, which works everywhere. */
export function whisperDevice(env: NodeJS.ProcessEnv = process.env): string {
  return setting("VIDEO_MCP_WHISPER_DEVICE", env) ?? "cpu";
}
