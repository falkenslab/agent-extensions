import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REQUIREMENTS, RequirementMissing, atLeast, howToInstall } from "../src/requirements.js";

describe("requirements", () => {
  it("compares versions", () => {
    assert.equal(atLeast("2.10.0", "2.9.0"), true);
    assert.equal(atLeast("2.9", "2.10.0"), false);
    assert.equal(atLeast("3", "3.0.0"), true);
  });

  it("are Ruby and Asker, in a shape agent-kit can check", () => {
    assert.deepEqual(
      REQUIREMENTS.map((r) => r.program),
      ["ruby", "asker"],
    );
    for (const requirement of REQUIREMENTS) {
      assert.match(requirement.program, /^[a-z][a-z0-9._-]*$/);
      for (const arg of requirement.version?.args ?? []) assert.match(arg, /^(--?[a-z-]+|version)$/);
      assert.ok(requirement.install.windows && requirement.install.macos && requirement.install.linux && requirement.install.url);
    }
  });

  it("say how to install them on each system", () => {
    assert.equal(howToInstall(REQUIREMENTS[0]!, "windows"), "run winget install RubyInstallerTeam.Ruby.3.4, or see https://www.ruby-lang.org/en/documentation/installation/");
    assert.match(howToInstall(REQUIREMENTS[1]!, "linux"), /gem install --user-install asker-tool --no-document/);
  });

  it("explain what's missing instead of failing raw", () => {
    const error = new RequirementMissing([
      { name: "Ruby", program: "ruby", installed: false, ok: false, problem: "not found", install: "run brew install ruby" },
      { name: "Asker", program: "asker", installed: false, ok: false, problem: "needs Ruby first", install: "run gem install asker-tool --no-document" },
    ]);
    assert.match(error.message, /^Ruby is needed for running Asker: not found\. To install it, run brew install ruby\. Asker is needed for generating questions: needs Ruby first\..*nothing was changed\.$/);
  });
});
