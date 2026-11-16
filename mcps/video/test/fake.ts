// Fakes of ffmpeg, ffprobe, yt-dlp and Python with faster-whisper for the tests, which run where none of
// them is installed (CI): each answers as the real one does to the calls this server makes, from the
// fixtures, and writes the files the real one would.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useFakes, type Command, type Program, type RunResult, type Runner } from "../src/run.js";
import { forgetRequirements } from "../src/requirements.js";
import { WHISPER_SCRIPT } from "../src/video/whisper.js";

export const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));
export const fixture = (name: string) => path.join(FIXTURES, name);
const read = (name: string) => readFileSync(fixture(name), "utf8");

export interface FakeCall {
  program: string;
  args: string[];
}

export interface FakeOptions {
  /** Programs that aren't installed. */
  missing?: Program[];
  /** Python runs, but faster-whisper isn't installed for it. */
  noWhisper?: boolean;
  /** What faster-whisper says, one JSON line each. */
  whisperLines?: string[];
}

const ok = (stdout = "", stderr = ""): RunResult => ({ code: 0, stdout, stderr });

export const WHISPER_LINES = [
  JSON.stringify({ info: { language: "es", probability: 0.97, duration: 12.5 } }),
  JSON.stringify({ start: 0.5, end: 3.2, text: " Hola a todos, hoy vemos git hub." }),
  JSON.stringify({ start: 3.4, end: 7.9, text: " Primero creamos un repositorio y lo clonamos en nuestro ordenador para trabajar en local." }),
  JSON.stringify({ start: 8.0, end: 12.0, text: " Después subimos los cambios." }),
];

/** Installs the fakes; returns the calls they get, and a function that puts the real ones back. */
export function fakePrograms(options: FakeOptions = {}): { calls: FakeCall[]; restore: () => void } {
  const calls: FakeCall[] = [];
  const runner: Runner = async (command: Command, args, runOptions = {}) => {
    const program = command.file;
    calls.push({ program, args });
    if (program === "python") {
      const script = args[1] ?? "";
      if (script.includes("sys.version")) return ok("3.12.4\n");
      if (script.startsWith("import faster_whisper")) return options.noWhisper ? { code: 1, stdout: "", stderr: "ModuleNotFoundError: No module named 'faster_whisper'" } : ok("1.1.1\n");
      if (script === WHISPER_SCRIPT) {
        const lines = options.whisperLines ?? WHISPER_LINES;
        for (const line of lines) runOptions.onLine?.(line);
        return ok(`${lines.join("\n")}\n`, "some library's warning\n");
      }
    }
    if (program === "yt-dlp") {
      if (args[0] === "--version") return ok("2025.01.15\n");
      if (args.includes("-J")) return ok(read("youtube-info.json"));
      const output = args[args.indexOf("-o") + 1] ?? "";
      if (args.includes("--write-subs") || args.includes("--write-auto-subs")) {
        const lang = args[args.indexOf("--sub-langs") + 1];
        writeFileSync(output.replace("%(ext)s", `${lang}.vtt`), read("youtube-auto.vtt"));
        return ok();
      }
      if (args.includes("-f")) {
        writeFileSync(output.replace("%(ext)s", "webm"), "fake media");
        return ok();
      }
    }
    if (program === "ffprobe") return ok(read("ffprobe.json"));
    if (program === "ffmpeg") {
      if (args[0] === "-version") return ok("ffmpeg version 7.1-full_build Copyright (c) 2000-2024\n");
      if (args.at(-1) === "-") return ok(read("youtube-auto.vtt"));
      const out = args.at(-1) ?? "";
      if (out.endsWith(".wav")) {
        writeFileSync(out, "RIFF fake");
        return ok();
      }
      if (out.includes("%05d")) {
        const times = [0, 12.48, 61.2, 125];
        times.forEach((_, i) => writeFileSync(out.replace("%05d", String(i + 1).padStart(5, "0")), "jpeg"));
        const stderr = times.map((t, i) => `[Parsed_showinfo_2 @ 0000020] n:${String(i).padStart(4)} pts:${t * 1000} pts_time:${t} duration:1`).join("\n");
        return ok("", `Input #0, mov\n${stderr}\n`);
      }
    }
    return { code: 1, stdout: "", stderr: `the fake doesn't know ${program} ${args.join(" ")}` };
  };
  const restore = useFakes(runner, async (program) => (options.missing?.includes(program) ? undefined : { file: program, args: [] }));
  forgetRequirements();
  return {
    calls,
    restore: () => {
      restore();
      forgetRequirements();
    },
  };
}
