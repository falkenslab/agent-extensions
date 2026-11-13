// Programs the person installs apart (ADR-004): checked, explained, never installed. This server needs
// Ruby and the asker-tool gem; Asker is always run as `ruby -S asker` (src/asker/run.ts).
import { GEM_MISSING, findRuby, runAsker, runProgram, type RubyLocation } from "./asker/run.js";

/** The same shape as agent-kit's metadata["agent-kit"].requirements, so the manifest can copy it. */
export interface Requirement {
  /** What the person knows it as: "Ruby". */
  name: string;
  /** A bare name on the PATH: "ruby". */
  program: string;
  /** How to read its version, and the minimum. */
  version?: { args: string[]; min: string };
  /** A command per system, and a page. */
  install: { windows?: string; macos?: string; linux?: string; url?: string };
  /** What it's for, in a few words, for the messages. */
  for?: string;
}

export interface RequirementStatus {
  name: string;
  program: string;
  installed: boolean;
  version?: string;
  ok: boolean;
  problem?: string;
  install?: string;
}

export const RUBY: Requirement = {
  name: "Ruby",
  program: "ruby",
  version: { args: ["--version"], min: "3.0.0" },
  install: {
    windows: "winget install RubyInstallerTeam.Ruby.3.4",
    macos: "brew install ruby",
    linux: "sudo apt install ruby",
    url: "https://www.ruby-lang.org/en/documentation/installation/",
  },
  for: "running Asker",
};

export const ASKER: Requirement = {
  name: "Asker",
  program: "asker",
  version: { args: ["version"], min: "2.10.0" },
  install: {
    windows: "gem install asker-tool --no-document",
    macos: "gem install asker-tool --no-document",
    linux: "gem install --user-install asker-tool --no-document",
    url: "https://github.com/teuton-software/asker/blob/master/docs/install/README.md",
  },
  for: "generating questions",
};

/** The requirements of this server, in the order they're installed. */
export const REQUIREMENTS: Requirement[] = [RUBY, ASKER];

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

const RESTART = "if it was just installed, restart the app that runs this server so it sees the new PATH";

function status(requirement: Requirement, found: { version?: string } | undefined, problem?: string): RequirementStatus {
  const base = { name: requirement.name, program: requirement.program };
  if (!found) return { ...base, installed: false, ok: false, problem: problem ?? "not installed, or not on the PATH", install: howToInstall(requirement) };
  const { version } = found;
  if (requirement.version && version && !atLeast(version, requirement.version.min))
    return { ...base, installed: true, version, ok: false, problem: `version ${version}, ${requirement.version.min} or later needed`, install: howToInstall(requirement) };
  return { ...base, installed: true, ...(version ? { version } : {}), ok: true };
}

const versionIn = (text: string) => text.match(/\d+\.\d+(\.\d+)?/)?.[0];

export interface AskerStatus {
  ok: boolean;
  requirements: RequirementStatus[];
  /** Where Ruby was found, when it was. */
  ruby?: RubyLocation;
}

/** Checks Ruby, then Asker through it. */
export async function checkRequirements(): Promise<AskerStatus> {
  const ruby = findRuby();
  if (!ruby) {
    const missing = status(RUBY, undefined, `not found (${RESTART})`);
    return { ok: false, requirements: [missing, status(ASKER, undefined, "needs Ruby first")] };
  }
  const said = await runProgram(ruby.ruby, ["--version"], { timeoutMs: 15_000 });
  const rubyStatus = status(RUBY, { version: versionIn(said.stdout) });
  let askerStatus: RequirementStatus;
  try {
    const asker = await runAsker(["version"], { timeoutMs: 60_000 });
    const version = asker.code === 0 ? versionIn(asker.stdout) : undefined;
    const failed = `${asker.stderr}${asker.stdout}`.trim().split("\n")[0]?.slice(0, 200);
    askerStatus = version
      ? status(ASKER, { version })
      : status(ASKER, undefined, asker.code === GEM_MISSING ? "the asker-tool gem isn't installed for this Ruby" : `it didn't start (${failed || `exit code ${asker.code}`})`);
  } catch {
    askerStatus = status(ASKER, undefined, "the asker-tool gem isn't installed for this Ruby");
  }
  const requirements = [rubyStatus, askerStatus];
  return { ok: requirements.every((r) => r.ok), requirements, ruby };
}

/** A tool's error when Ruby or Asker is missing: what, what for, and how to install it; never a raw error. */
export class RequirementMissing extends Error {
  constructor(statuses: RequirementStatus[]) {
    const lines = statuses.filter((s) => !s.ok).map((s) => {
      const requirement = REQUIREMENTS.find((r) => r.program === s.program);
      return `${s.name} is needed${requirement?.for ? ` for ${requirement.for}` : ""}: ${s.problem}.${s.install ? ` To install it, ${s.install}.` : ""}`;
    });
    super(`${lines.join(" ")} Then try again; nothing was changed.`);
    this.name = "RequirementMissing";
  }
}

let checked = false;

/** Throws RequirementMissing unless Ruby and Asker are there: the first line of a tool that runs Asker. Once they are, it doesn't check again. */
export async function needsAsker(): Promise<void> {
  if (checked) return;
  const result = await checkRequirements();
  if (!result.ok) throw new RequirementMissing(result.requirements);
  checked = true;
}

/** For tests: forget that Asker was found. */
export function forgetAsker(found = false): void {
  checked = found;
}
