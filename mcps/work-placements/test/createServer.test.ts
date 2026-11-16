import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { connect, freshFolders, structured } from "./helpers.js";

describe("createServer", () => {
  beforeEach(() => void freshFolders());

  it("sends its instructions", async () => {
    const client = await connect();
    assert.match(client.getInstructions() ?? "", /read-only/);
    assert.match(client.getInstructions() ?? "", /sends nothing/);
  });

  it("marks the reads read-only, and nothing else", async () => {
    const { tools } = await (await connect()).listTools();
    const readOnly = tools.filter((t) => t.annotations?.readOnlyHint).map((t) => t.name).sort();
    assert.deepEqual(readOnly, ["list_companies", "pipeline_summary", "read_company_site", "search_companies", "server_info"]);
    for (const tool of tools) assert.notEqual(tool.annotations?.destructiveHint, true, `${tool.name} destroys nothing`);
    assert.equal(tools.find((t) => t.name === "search_companies")?.annotations?.openWorldHint, true);
  });

  it("has no check_requirements while it needs nothing installed apart", async () => {
    const { tools } = await (await connect()).listTools();
    assert.equal(tools.some((t) => t.name === "check_requirements"), false);
  });

  it("returns its name, version and settings, without the Places key", async () => {
    process.env.WORK_PLACEMENTS_PLACES_KEY = "secret-key";
    process.env.WORK_PLACEMENTS_AREA = "${user_config.area}";
    const result = await (await connect()).callTool({ name: "server_info", arguments: {} });
    const info = structured<Record<string, unknown>>(result);
    assert.equal(info.name, "@falkenslab/work-placements-mcp");
    assert.equal(info.placesKey, true);
    assert.equal(info.area, undefined, "an unexpanded placeholder is not set");
    assert.equal(info.companies, 0);
    assert.doesNotMatch(JSON.stringify(result), /secret-key/);
  });
});
