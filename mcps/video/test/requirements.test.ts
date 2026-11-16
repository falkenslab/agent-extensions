import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { REQUIREMENTS, RequirementMissing, atLeast, checkRequirements, howToInstall, needs } from "../src/requirements.js";
import { fakePrograms } from "./fake.js";

let restore = () => {};
afterEach(() => restore());

describe("requirements", () => {
  it("compare versions, yt-dlp's dates too", () => {
    assert.equal(atLeast("7.1", "5.1.0"), true);
    assert.equal(atLeast("4.4.2", "5.1.0"), false);
    assert.equal(atLeast("2025.01.15", "2024.12.13"), true);
  });

  it("are ffmpeg, Python with faster-whisper and yt-dlp, in a shape agent-kit can check", () => {
    assert.deepEqual(
      REQUIREMENTS.map((r) => r.program),
      ["ffmpeg", "python3", "yt-dlp"],
    );
    for (const requirement of REQUIREMENTS) {
      assert.match(requirement.program, /^[A-Za-z0-9][A-Za-z0-9._+-]*$/);
      for (const arg of requirement.version?.args ?? []) assert.match(arg, /^(--?[A-Za-z][A-Za-z0-9-]*|version)$/);
      assert.match(requirement.version?.min ?? "", /^\d+(\.\d+){0,2}$/);
      assert.ok(requirement.install.windows && requirement.install.macos && requirement.install.linux && requirement.install.url);
      assert.ok(requirement.capabilities.length);
    }
  });

  it("are the ones the video extension's manifest declares, for the same capabilities", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../../extensions/video/.claude-plugin/plugin.json", import.meta.url), "utf8")) as { metadata: { "agent-kit": { requirements: unknown[] } } };
    assert.deepEqual(
      manifest.metadata["agent-kit"].requirements,
      REQUIREMENTS.map(({ name, program, version, install, capabilities }) => ({ name, program, version, install, for: capabilities })),
    );
  });

  it("say how to install them on each system", () => {
    assert.equal(howToInstall(REQUIREMENTS[0]!, "windows"), "run winget install Gyan.FFmpeg, or see https://ffmpeg.org/download.html");
    assert.match(howToInstall(REQUIREMENTS[2]!, "macos"), /brew install yt-dlp/);
  });

  it("report each one with its version and where it is", async () => {
    restore = fakePrograms().restore;
    const { ok, requirements } = await checkRequirements();
    assert.equal(ok, true);
    assert.deepEqual(
      requirements.map((r) => [r.name, r.version, r.path]),
      [
        ["ffmpeg", "7.1", "ffmpeg"],
        ["Python with faster-whisper", "3.12.4", "python"],
        ["yt-dlp", "2025.01.15", "yt-dlp"],
      ],
    );
  });

  it("report what's missing, with how to install it", async () => {
    restore = fakePrograms({ missing: ["yt-dlp"], noWhisper: true }).restore;
    const { ok, requirements } = await checkRequirements();
    assert.equal(ok, false);
    assert.equal(requirements[0]!.ok, true);
    assert.match(requirements[1]!.problem ?? "", /faster-whisper isn't installed/);
    assert.equal(requirements[2]!.installed, false);
    assert.ok(requirements[2]!.install);
  });

  it("stop a tool that needs one, saying what to install and never installing it", async () => {
    restore = fakePrograms({ missing: ["ffmpeg"] }).restore;
    await assert.rejects(needs("ffmpeg"), (error: Error) => error instanceof RequirementMissing && /^ffmpeg is needed for extracting .*To install it, run .*Never install it yourself/.test(error.message));
  });
});
