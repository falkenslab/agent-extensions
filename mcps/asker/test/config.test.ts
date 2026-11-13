import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { askerIni } from "../src/asker/config.js";

describe("asker.ini", () => {
  it("never lets Asker go on the internet, and always writes Moodle XML and GIFT", () => {
    const ini = askerIni({ outputFolder: "C:\\Users\\Ana María\\out" });
    assert.match(ini, /^internet = no$/m);
    assert.match(ini, /^color = no$/m);
    assert.match(ini, /^moodle = yes$/m);
    assert.match(ini, /^gift = yes$/m);
    assert.match(ini, /^doc = no$/m);
    assert.match(ini, /^folder = "C:\\Users\\Ana María\\out"$/m);
    assert.match(ini, /^stages = "d,b,f,i,s,t"$/m);
    assert.match(ini, /^fractions = ",-50,/m);
  });

  it("takes the options", () => {
    const ini = askerIni({ outputFolder: "/tmp/out", doc: true, stages: ["definitions", "sequences"], category: "Unit 3: Rock, 2024", penalties: false, exclude: ["misspelled", "ddmatch"] });
    assert.match(ini, /^doc = yes$/m);
    assert.match(ini, /^stages = "d,s"$/m);
    assert.match(ini, /^category = "Unit 3: Rock, 2024"$/m);
    assert.match(ini, /^fractions = "0,0,0,0,0,0,0,0,0,0"$/m);
    assert.match(ini, /^exclude = "misspelled, ddmatch"$/m);
  });

  it("refuses what can't go in it", () => {
    assert.throws(() => askerIni({ outputFolder: "/tmp/out", category: 'say "hi"' }), /double quotes/);
    assert.throws(() => askerIni({ outputFolder: "/tmp/out", exclude: ["a,b"] }), /comma/);
  });
});
