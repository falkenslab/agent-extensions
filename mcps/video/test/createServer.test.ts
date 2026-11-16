import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { connect } from "./connect.js";

describe("createServer", () => {
  it("sends its instructions", async () => {
    const client = await connect();
    assert.match(client.getInstructions() ?? "", /get_captions/);
  });

  it("lists its tools, saying which only read", async () => {
    const { tools } = await (await connect()).listTools();
    const readOnly = Object.fromEntries(tools.map((t) => [t.name, t.annotations?.readOnlyHint]));
    assert.deepEqual(readOnly, {
      get_video_info: true,
      get_captions: true,
      transcribe_video: false,
      extract_frames: false,
      write_subtitles: false,
      check_requirements: true,
      server_info: true,
    });
    for (const tool of tools.filter((t) => !t.annotations?.readOnlyHint)) assert.equal(tool.annotations?.destructiveHint, false, tool.name);
  });
});
