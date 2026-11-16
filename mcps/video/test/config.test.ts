import assert from "node:assert/strict";
import { homedir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { defaultLanguage, whisperDevice, whisperModel, workDir } from "../src/config.js";

describe("settings", () => {
  it("keep work in the folder given, else the extension's data folder, else ~/.video-mcp", () => {
    assert.equal(workDir({ VIDEO_MCP_WORK_DIR: "~/videos" }), path.join(homedir(), "videos"));
    assert.equal(workDir({ VIDEO_MCP_WORK_DIR: "${user_config.work_folder}", CLAUDE_PLUGIN_DATA: path.join(homedir(), "data") }), path.join(homedir(), "data", "work"));
    assert.equal(workDir({}), path.join(homedir(), ".video-mcp"));
  });

  it("use whisper's small model on the CPU, and detect the language, unless set", () => {
    assert.equal(whisperModel({}), "small");
    assert.equal(whisperModel({ VIDEO_MCP_WHISPER_MODEL: "${user_config.whisper_model}" }), "small");
    assert.equal(whisperModel({ VIDEO_MCP_WHISPER_MODEL: "medium" }), "medium");
    assert.equal(whisperDevice({}), "cpu");
    assert.equal(defaultLanguage({}), undefined);
    assert.equal(defaultLanguage({ VIDEO_MCP_LANGUAGE: "auto" }), undefined);
    assert.equal(defaultLanguage({ VIDEO_MCP_LANGUAGE: "ES" }), "es");
  });
});
