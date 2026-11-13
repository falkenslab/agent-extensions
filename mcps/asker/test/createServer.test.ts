import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { connect } from "./connect.js";

describe("createServer", () => {
  it("sends its instructions", async () => {
    const client = await connect();
    assert.match(client.getInstructions() ?? "", /definitions file/);
  });

  it("lists its tools, saying which only read", async () => {
    const { tools } = await (await connect()).listTools();
    const readOnly = Object.fromEntries(tools.map((t) => [t.name, t.annotations?.readOnlyHint]));
    assert.deepEqual(readOnly, {
      asker_input_reference: true,
      check_input: true,
      generate_questions: false,
      read_questions: true,
      exclude_questions: false,
      check_requirements: true,
      server_info: true,
    });
    for (const tool of tools) assert.equal(tool.annotations?.openWorldHint, false, tool.name);
  });
});
