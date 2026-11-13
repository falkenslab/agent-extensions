// A fake asker for the tests: it answers with what the real one said and wrote for the same input
// (test/fixtures/runs/, from scripts/capture-fixtures.mjs), and writes its files where the asker.ini
// in the folder it runs in says, as Asker does.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RunResult, Runner } from "../src/asker/run.js";

export const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));
export const INPUTS = path.join(FIXTURES, "inputs");
export const RUNS = path.join(FIXTURES, "runs");

export const input = (...parts: string[]) => path.join(INPUTS, ...parts);
export const run = (name: string, file: string) => path.join(RUNS, name, file);

interface Captured extends RunResult {
  input: string;
}

const captured = (name: string, kind: "check" | "run"): Captured => JSON.parse(readFileSync(run(name, `${kind}.json`), "utf8")) as Captured;

export interface FakeCall {
  args: string[];
  ini?: string;
}

/** A fake runner, and the calls it got. */
export function fakeAsker(): { runner: Runner; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const runner: Runner = async (args, options = {}) => {
    const iniFile = options.cwd ? path.join(options.cwd, "asker.ini") : undefined;
    const ini = iniFile && existsSync(iniFile) ? readFileSync(iniFile, "utf8") : undefined;
    calls.push({ args, ...(ini ? { ini } : {}) });
    if (args[0] === "version") return { code: 0, stdout: "asker version 2.10.0\n", stderr: "" };
    const check = args[0] === "check";
    const file = check ? args[1] : args[0];
    if (!file) return { code: 1, stdout: "", stderr: "no file" };
    const name = path.basename(file, path.extname(file));
    const said = captured(name, check ? "check" : "run");
    if (!check && said.code === 0 && ini) {
      const folder = /^folder = "(.*)"$/m.exec(ini)?.[1];
      if (!folder) throw new Error("the asker.ini has no output folder");
      mkdirSync(folder, { recursive: true });
      const outputs = [`${name}-moodle.xml`, `${name}-gift.txt`, ...(/^doc = yes$/m.test(ini) ? [`${name}.txt`] : [])];
      for (const out of outputs) copyFileSync(run(name, out), path.join(folder, out));
    }
    return { code: said.code, stdout: said.stdout, stderr: said.stderr };
  };
  return { runner, calls };
}
