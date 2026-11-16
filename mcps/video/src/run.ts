// Running the programs this server uses (ffmpeg, ffprobe, yt-dlp, Python): found on the PATH (or, for
// Python, through VIDEO_MCP_PYTHON), always run without a shell, with an argument list. Tests swap the
// runner and the locator for fakes, so they need none of the programs.
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { setting } from "./settings.js";

/** A program to run: its file, and the arguments that always go first (`py -3`, `python -m yt_dlp`). */
export interface Command {
  file: string;
  args: string[];
}

export interface RunResult {
  /** The exit code; null when it was stopped (a timeout) or didn't start. */
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface RunOptions {
  cwd?: string;
  timeoutMs?: number;
  /** Each line of stdout as it comes, for long runs that report progress. */
  onLine?: (line: string) => void;
}

export type Runner = (command: Command, args: string[], options?: RunOptions) => Promise<RunResult>;

/** The programs this server knows how to find. */
export type Program = "ffmpeg" | "ffprobe" | "yt-dlp" | "python";

export type Locator = (program: Program) => Promise<Command | undefined>;

function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** Every file a program's name finds on the PATH, as a shell would (with PATHEXT's extensions on Windows). */
export function findAllOnPath(program: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? ["", ...(env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").map((e) => e.toLowerCase())] : [""];
  const found: string[] = [];
  for (const dir of dirs) for (const extension of extensions) {
    const file = path.join(dir, `${program}${extension}`);
    if (isFile(file) && !found.includes(file)) found.push(file);
  }
  // A Windows script (.cmd, .bat) can't run without a shell: only real programs.
  return process.platform === "win32" ? found.filter((file) => /\.(exe|com)$/i.test(file)) : found;
}

const KEEP = 8 * 1024 * 1024;

/** The real runner: spawns the program without a shell and collects its output. */
export const spawnRunner: Runner = (command, args, options = {}) =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let pending = "";
    let timedOut = false;
    let child;
    try {
      child = spawn(command.file, [...command.args, ...args], { cwd: options.cwd, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolve({ code: null, stdout: "", stderr: String(error) });
      return;
    }
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = (stdout + chunk).slice(-KEEP);
      if (!options.onLine) return;
      pending += chunk;
      let end;
      while ((end = pending.indexOf("\n")) >= 0) {
        options.onLine(pending.slice(0, end).replace(/\r$/, ""));
        pending = pending.slice(end + 1);
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-KEEP);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs ?? 300_000);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: `${stderr}${String(error)}` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (options.onLine && pending) options.onLine(pending);
      resolve({ code: timedOut ? null : code, stdout, stderr, ...(timedOut ? { timedOut } : {}) });
    });
  });

let runner: Runner = spawnRunner;

/** Runs a program with the current runner. */
export const run: Runner = (command, args, options) => runner(command, args, options);

/** Python's candidates on this system, in the order they're tried. */
function pythonCandidates(): Command[] {
  const configured = setting("VIDEO_MCP_PYTHON");
  if (configured) return [{ file: configured, args: [] }];
  // On Windows, python3.exe and python.exe in WindowsApps are the Microsoft Store's stubs, not Python.
  const real = (name: string) => findAllOnPath(name).filter((file) => !/[\\/]WindowsApps[\\/]/i.test(file));
  if (process.platform === "win32") return [...real("python").map((file) => ({ file, args: [] })), ...real("py").map((file) => ({ file, args: ["-3"] })), ...real("python3").map((file) => ({ file, args: [] }))];
  return [...real("python3"), ...real("python")].map((file) => ({ file, args: [] }));
}

/** The Python that runs faster-whisper: the first candidate that has it, else the first that runs at all. */
async function findPython(): Promise<Command | undefined> {
  let working: Command | undefined;
  for (const candidate of pythonCandidates()) {
    const said = await run(candidate, ["-c", "import sys; print(sys.version.split()[0])"], { timeoutMs: 20_000 });
    if (said.code !== 0) continue;
    working ??= candidate;
    const whisper = await run(candidate, ["-c", "import faster_whisper"], { timeoutMs: 60_000 });
    if (whisper.code === 0) return candidate;
  }
  return working;
}

/** yt-dlp on the PATH, else as a module of the Python found (pip's Scripts folder is often off the PATH). */
async function findYtDlp(): Promise<Command | undefined> {
  const [file] = findAllOnPath("yt-dlp");
  if (file) return { file, args: [] };
  const python = await locate("python");
  if (!python) return undefined;
  const said = await run(python, ["-m", "yt_dlp", "--version"], { timeoutMs: 30_000 });
  return said.code === 0 ? { file: python.file, args: [...python.args, "-m", "yt_dlp"] } : undefined;
}

const realLocator: Locator = async (program) => {
  if (program === "python") return findPython();
  if (program === "yt-dlp") return findYtDlp();
  const [file] = findAllOnPath(program);
  return file ? { file, args: [] } : undefined;
};

let locator: Locator = realLocator;
const found = new Map<Program, Command>();

/** Where a program is, or undefined. Once found, it's remembered; a missing one is looked for again next time. */
export async function locate(program: Program): Promise<Command | undefined> {
  const known = found.get(program);
  if (known) return known;
  const command = await locator(program);
  if (command) found.set(program, command);
  return command;
}

/** For tests: replaces the runner and the locator, forgetting what was found. Returns a function that restores them. */
export function useFakes(fakeRunner: Runner, fakeLocator: Locator): () => void {
  const previous = { runner, locator };
  runner = fakeRunner;
  locator = fakeLocator;
  found.clear();
  return () => {
    runner = previous.runner;
    locator = previous.locator;
    found.clear();
  };
}
