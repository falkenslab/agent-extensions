// Programs the person installs apart (ADR-004): checked, explained, never installed. ffmpeg (with its
// ffprobe) takes frames and reads a file's streams, Python with faster-whisper transcribes, yt-dlp reads YouTube.
import { locate, run } from "./run.js";

/** The same shape as agent-kit's metadata["agent-kit"].requirements, so the manifest can copy it. */
export interface Requirement {
  /** What the person knows it as. */
  name: string;
  /** A bare name on the PATH: what agent-kit looks for. */
  program: string;
  /** How to read its version, and the minimum. */
  version?: { args: string[]; min: string };
  /** A command per system, and a page. */
  install: { windows?: string; macos?: string; linux?: string; url?: string };
  /** What it's for, in a few words, for the messages. */
  for: string;
  /** The capabilities that need it, as the extension's manifest names them. */
  capabilities: string[];
}

export interface RequirementStatus {
  name: string;
  program: string;
  installed: boolean;
  version?: string;
  ok: boolean;
  problem?: string;
  /** How to install it on this system. */
  install?: string;
  /** How to install it on every system. */
  installBySystem: Requirement["install"];
  /** What needs it. */
  for: string;
  /** Where it was found, when it was. */
  path?: string;
}

export const FFMPEG: Requirement = {
  name: "ffmpeg",
  program: "ffmpeg",
  version: { args: ["-version"], min: "5.1.0" },
  install: { windows: "winget install Gyan.FFmpeg", macos: "brew install ffmpeg", linux: "sudo apt install ffmpeg", url: "https://ffmpeg.org/download.html" },
  for: "the frames to look at, and a video file's details and its own subtitles",
  capabilities: ["video-visual"],
};

export const WHISPER: Requirement = {
  name: "Python with faster-whisper",
  program: "python3",
  version: { args: ["--version"], min: "3.9.0" },
  install: {
    windows: "py -m pip install faster-whisper",
    macos: "python3 -m venv ~/.video-mcp-python && ~/.video-mcp-python/bin/pip install faster-whisper (then set the Python setting to ~/.video-mcp-python/bin/python)",
    linux: "python3 -m venv ~/.video-mcp-python && ~/.video-mcp-python/bin/pip install faster-whisper (then set the Python setting to ~/.video-mcp-python/bin/python)",
    url: "https://github.com/SYSTRAN/faster-whisper#installation",
  },
  for: "transcribing speech when a video has no captions",
  capabilities: ["video-transcription"],
};

export const YT_DLP: Requirement = {
  name: "yt-dlp",
  program: "yt-dlp",
  version: { args: ["--version"], min: "2024.12.13" },
  install: { windows: "winget install yt-dlp.yt-dlp", macos: "brew install yt-dlp", linux: "pipx install yt-dlp", url: "https://github.com/yt-dlp/yt-dlp/wiki/Installation" },
  for: "reading YouTube videos (their captions, and downloading them)",
  capabilities: ["video-online"],
};

/** The requirements of this server. */
export const REQUIREMENTS: Requirement[] = [FFMPEG, WHISPER, YT_DLP];

type System = "windows" | "macos" | "linux";
const system = (): System => (process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux");

/** Whether a version like 2.10.0 is at least a minimum like 2.9.0. */
export function atLeast(found: string, min: string): boolean {
  const [a, b] = [found, min].map((v) => v.split(".").map((n) => Number.parseInt(n, 10) || 0));
  for (let i = 0; i < 3; i++) {
    const [x, y] = [a?.[i] ?? 0, b?.[i] ?? 0];
    if (x !== y) return x > y;
  }
  return true;
}

/** How to install it on this system, in one line. */
export function howToInstall(requirement: Requirement, on: System = system()): string {
  const command = requirement.install[on];
  return [command && `run ${command}`, requirement.install.url && `see ${requirement.install.url}`].filter(Boolean).join(", or ") || "see its website";
}

/** The first version in a program's words: "ffmpeg version 7.1-full" → 7.1; yt-dlp's 2025.01.15. */
export const versionIn = (text: string): string | undefined => text.match(/\d+\.\d+(\.\d+)?/)?.[0];

const RESTART = "if it was just installed, restart the app that runs this server so it sees it";

function status(requirement: Requirement, found: { version?: string; path?: string } | undefined, problem?: string): RequirementStatus {
  const base = { name: requirement.name, program: requirement.program, installBySystem: requirement.install, for: requirement.for };
  if (!found || problem) return { ...base, installed: Boolean(found), ...(found?.version ? { version: found.version } : {}), ok: false, problem: problem ?? `not found (${RESTART})`, install: howToInstall(requirement) };
  const { version } = found;
  if (requirement.version && version && !atLeast(version, requirement.version.min))
    return { ...base, installed: true, version, ok: false, problem: `version ${version}, ${requirement.version.min} or later needed`, install: howToInstall(requirement), ...(found.path ? { path: found.path } : {}) };
  return { ...base, installed: true, ...(version ? { version } : {}), ok: true, ...(found.path ? { path: found.path } : {}) };
}

const where = (command: { file: string; args: string[] }) => [command.file, ...command.args].join(" ");

async function checkFfmpeg(): Promise<RequirementStatus> {
  const ffmpeg = await locate("ffmpeg");
  if (!ffmpeg) return status(FFMPEG, undefined);
  const said = await run(ffmpeg, ["-version"], { timeoutMs: 20_000 });
  if (said.code !== 0) return status(FFMPEG, { path: where(ffmpeg) }, `it's there but didn't run (${(said.stderr || said.stdout).trim().slice(0, 200)})`);
  if (!(await locate("ffprobe"))) return status(FFMPEG, { path: where(ffmpeg) }, "ffprobe, which comes with ffmpeg, isn't on the PATH: reinstall ffmpeg from a full build");
  const version = /ffmpeg version n?(\d+\.\d+(\.\d+)?)/.exec(said.stdout)?.[1];
  return status(FFMPEG, { ...(version ? { version } : {}), path: where(ffmpeg) });
}

async function checkWhisper(): Promise<RequirementStatus> {
  const python = await locate("python");
  if (!python) return status(WHISPER, undefined, `Python wasn't found (${RESTART})`);
  const said = await run(python, ["-c", "import sys; print(sys.version.split()[0])"], { timeoutMs: 20_000 });
  const version = versionIn(said.stdout);
  if (version && !atLeast(version, WHISPER.version!.min)) return status(WHISPER, { version, path: where(python) }, `Python ${version}, 3.9 or later needed`);
  const whisper = await run(python, ["-c", "import faster_whisper; print(faster_whisper.__version__)"], { timeoutMs: 60_000 });
  if (whisper.code !== 0) return status(WHISPER, { ...(version ? { version } : {}), path: where(python) }, `Python ${version ?? ""} is there, but faster-whisper isn't installed for it`.replace("  ", " "));
  return status(WHISPER, { ...(version ? { version } : {}), path: where(python) });
}

async function checkYtDlp(): Promise<RequirementStatus> {
  const ytDlp = await locate("yt-dlp");
  if (!ytDlp) return status(YT_DLP, undefined);
  const said = await run(ytDlp, ["--version"], { timeoutMs: 30_000 });
  const version = versionIn(said.stdout);
  if (said.code !== 0) return status(YT_DLP, { path: where(ytDlp) }, `it's there but didn't run (${(said.stderr || said.stdout).trim().slice(0, 200)})`);
  return status(YT_DLP, { ...(version ? { version } : {}), path: where(ytDlp) });
}

export interface VideoRequirements {
  ok: boolean;
  requirements: RequirementStatus[];
}

/** Checks ffmpeg, Python with faster-whisper and yt-dlp, each on its own. */
export async function checkRequirements(): Promise<VideoRequirements> {
  const requirements = [await checkFfmpeg(), await checkWhisper(), await checkYtDlp()];
  return { ok: requirements.every((r) => r.ok), requirements };
}

/** A tool's error when what it needs is missing: what, what for, and how to install it; never a raw error. */
export class RequirementMissing extends Error {
  constructor(statuses: RequirementStatus[]) {
    const lines = statuses.map((s) => `${s.name} is needed for ${s.for}: ${s.problem}.${s.install ? ` To install it, ${s.install}.` : ""}`);
    super(`${lines.join(" ")} Then try again (check_requirements says what's there); nothing was changed. Never install it yourself: tell the person.`);
    this.name = "RequirementMissing";
  }
}

const CHECKS: Record<"ffmpeg" | "whisper" | "yt-dlp", () => Promise<RequirementStatus>> = { ffmpeg: checkFfmpeg, whisper: checkWhisper, "yt-dlp": checkYtDlp };
const ready = new Set<string>();

/** Throws RequirementMissing unless these are there: the first line of a tool that runs them. Once one is, it isn't checked again. */
export async function needs(...what: (keyof typeof CHECKS)[]): Promise<void> {
  const missing: RequirementStatus[] = [];
  for (const name of what) {
    if (ready.has(name)) continue;
    const result = await CHECKS[name]();
    if (result.ok) ready.add(name);
    else missing.push(result);
  }
  if (missing.length) throw new RequirementMissing(missing);
}

/** For tests: forget what was found. */
export function forgetRequirements(): void {
  ready.clear();
}
