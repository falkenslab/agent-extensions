import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const text = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const manifest = JSON.parse(text) as { private?: boolean; publishConfig?: { access?: string } };

describe("package.json", () => {
  it("publishes the scoped package as public: npm makes it private, and paid, otherwise", () => {
    assert.equal(manifest.publishConfig?.access, "public");
  });

  it("isn't private: it's a server, published by its owner", () => {
    assert.equal(manifest.private, undefined);
  });
});
