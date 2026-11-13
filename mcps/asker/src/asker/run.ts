// Running Asker: always as `ruby -S asker …`, so the same call works on every system (on Windows the
// `asker` command is a .bat, which can't run without a shell). Ruby is found through ASKER_MCP_RUBY, the
// PATH, or, on Windows, RubyInstaller's default folders: an app started before Ruby was installed doesn't
// see it on its PATH until it's restarted. Tests swap the runner for a fake one.
import { execFile } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { setting } from "../settings.js";

export interface RunResult {
  /** The exit code; null when it was stopped (a timeout). */
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  /** The folder Asker runs in: it reads asker.ini from there. */
  cwd?: string;
  timeoutMs?: number;
}

/** Runs `asker` with these arguments. */
export type Runner = (args: string[], options?: RunOptions) => Promise<RunResult>;

/** Where Ruby is, and whether it came from the PATH. */
export interface RubyLocation {
  ruby: string;
  onPath: boolean;
}

function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** A program on the PATH, as a shell finds it (with PATHEXT's extensions on Windows). */
export function findOnPath(program: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? ["", ...(env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").map((e) => e.toLowerCase())] : [""];
  for (const dir of dirs) for (const extension of extensions) if (isFile(path.join(dir, `${program}${extension}`))) return path.join(dir, `${program}${extension}`);
  return undefined;
}

/** RubyInstaller's folders (C:\Ruby34-x64\bin\ruby.exe…), newest first. */
function windowsRubies(): string[] {
  const roots = ["C:\\", "C:\\tools\\"];
  const found: string[] = [];
  for (const root of roots) {
    let entries: string[];
    try {
      entries = readdirSync(root).filter((name) => /^ruby\d+/i.test(name));
    } catch {
      continue;
    }
    for (const name of entries) {
      const ruby = path.join(root, name, "bin", "ruby.exe");
      if (isFile(ruby)) found.push(ruby);
    }
  }
  const version = (file: string) => Number.parseInt(/ruby(\d+)/i.exec(file)?.[1] ?? "0", 10);
  return found.sort((a, b) => version(b) - version(a));
}

/** Where Ruby is: ASKER_MCP_RUBY, the PATH, or RubyInstaller's folders on Windows. */
export function findRuby(env: NodeJS.ProcessEnv = process.env): RubyLocation | undefined {
  const configured = setting("ASKER_MCP_RUBY", env);
  if (configured) return isFile(configured) ? { ruby: configured, onPath: false } : undefined;
  const onPath = findOnPath("ruby", env);
  if (onPath) return { ruby: onPath, onPath: true };
  if (process.platform === "win32") {
    const [ruby] = windowsRubies();
    if (ruby) return { ruby, onPath: false };
  }
  return undefined;
}

/** Thrown when there's no Ruby to run Asker with. */
export class RubyNotFound extends Error {
  constructor() {
    super("Ruby wasn't found");
    this.name = "RubyNotFound";
  }
}

/** Runs a program, never through a shell, and collects its output. */
export function runProgram(file: string, args: string[], options: RunOptions & { env?: NodeJS.ProcessEnv } = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      { cwd: options.cwd, env: options.env, timeout: options.timeoutMs ?? 300_000, windowsHide: true, shell: false, maxBuffer: 64 * 1024 * 1024, encoding: "utf8" },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === "number" ? error.code : error.killed ? null : 1) : 0;
        resolve({ code, stdout: stdout ?? "", stderr: `${stderr ?? ""}${error && typeof error.code !== "number" && !error.killed ? `\n${error.message}` : ""}` });
      },
    );
  });
}

/** The exit code when Ruby runs but the asker-tool gem isn't installed for it. */
export const GEM_MISSING = 127;

// Loads the gem's own `asker` executable, wherever the gem put it: --user-install and Homebrew's Ruby
// leave it off the PATH, and on Windows it's a .bat.
const LAUNCHER = `begin; bin = Gem.bin_path("asker-tool", "asker"); rescue Gem::Exception; warn "asker-tool isn't installed for this Ruby"; exit ${GEM_MISSING}; end; load bin`;

/** The real runner: Ruby loads the asker-tool gem's command, with Ruby's own folder first on the PATH. */
export const rubyRunner: Runner = async (args, options = {}) => {
  const location = findRuby();
  if (!location) throw new RubyNotFound();
  const bin = path.dirname(location.ruby);
  // eslint-disable-next-line no-restricted-syntax -- the child's environment, not a setting
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH ?? process.env.Path ?? ""}`, RUBYOPT: "-Eutf-8:utf-8" };
  if (process.platform === "win32") delete env.Path;
  return runProgram(location.ruby, ["-e", LAUNCHER, "--", ...args], { ...options, env });
};

let current: Runner = rubyRunner;

/** Runs Asker with the current runner. */
export const runAsker: Runner = (args, options) => current(args, options);

/** For tests: replaces the runner, and returns the previous one. */
export function useRunner(runner: Runner): Runner {
  const previous = current;
  current = runner;
  return previous;
}
