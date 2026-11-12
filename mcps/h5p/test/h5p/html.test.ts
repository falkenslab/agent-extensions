import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowedTags, checkHtml, escapeText } from "../../src/h5p/html.js";
import type { Field } from "../../src/h5p/libraries.js";

const field: Field = { name: "text", type: "text", widget: "html", tags: ["strong", "em", "a", "ul"] };

describe("html", () => {
  it("allows a field's tags, the four H5P adds and those that go with them", () => {
    assert.deepEqual(allowedTags(field).sort(), ["a", "br", "div", "em", "li", "p", "span", "strong", "ul"]);
  });

  it("keeps allowed HTML, escaping stray characters", () => {
    const { html, problems } = checkHtml('<p>a & b <strong>c</strong> <a href="https://h5p.org">d</a></p>', field);
    assert.deepEqual(problems, []);
    assert.equal(html, '<p>a &amp; b <strong>c</strong> <a href="https://h5p.org">d</a></p>');
  });

  it("refuses what the site would strip", () => {
    const { problems } = checkHtml('<h2 onclick="x()">t</h2><a href="javascript:alert(1)">l</a><p style="color: red">c</p><!-- n -->', field);
    assert.equal(problems.length, 4);
    assert.match(problems[0] ?? "", /<h2> isn't allowed here/);
    assert.match(problems[1] ?? "", /protocol/);
    assert.match(problems[2] ?? "", /style "color: red"/);
    assert.match(problems[3] ?? "", /comments/);
  });

  it("allows text alignment everywhere, font styles only where the field has them", () => {
    assert.deepEqual(checkHtml('<p style="text-align: center;">x</p>', field).problems, []);
    assert.deepEqual(checkHtml('<p style="color: #ff0000">x</p>', { ...field, font: { color: true } }).problems, []);
  });

  it("escapes plain text without encoding entities twice", () => {
    assert.equal(escapeText(`<a> & &lt; "x" 'y'`), "&lt;a&gt; &amp; &lt; &quot;x&quot; &#039;y&#039;");
  });
});
