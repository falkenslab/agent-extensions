import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { extractFacts } from "../../src/site/extract.js";
import { readSite, siteUrl } from "../../src/site/read.js";
import { allowed, rulesFor } from "../../src/site/robots.js";
import { fakeFetch, html, text } from "../helpers.js";

const HOME = `<html><head><title>Informática Teide</title><meta name="description" content="Software &amp; networks for small businesses."></head>
<body><nav><a href="/contacto">Contacto</a> <a href="/trabaja-con-nosotros">Trabaja con nosotros</a> <a href="/blog">Blog</a></nav>
<p>Write to info&#64;teide.example or call. Tel: +34 922 123 456</p>
<a href="mailto:Ana.Perez@teide.example?subject=Hi">Ana</a>
<a href="https://www.linkedin.com/company/teide/">LinkedIn</a>
<img src="logo@2x.png"></body></html>`;

describe("robots.txt", () => {
  const robots = "User-agent: *\nDisallow: /private\nAllow: /private/open\n\nUser-agent: OtherBot\nDisallow: /\n";

  it("applies the longest match, Allow on a tie", () => {
    const rules = rulesFor(robots, "work-placements-mcp");
    assert.equal(allowed(rules, "/"), true);
    assert.equal(allowed(rules, "/private/x"), false);
    assert.equal(allowed(rules, "/private/open/x"), true);
  });

  it("uses its own group when there's one", () => {
    const rules = rulesFor("User-agent: *\nAllow: /\n\nUser-agent: work-placements-mcp\nDisallow: /\n", "work-placements-mcp");
    assert.equal(allowed(rules, "/"), false);
  });

  it("understands * and $", () => {
    const rules = rulesFor("User-agent: *\nDisallow: /*.pdf$\n", "work-placements-mcp");
    assert.equal(allowed(rules, "/a/b.pdf"), false);
    assert.equal(allowed(rules, "/a/b.pdf?x"), true);
  });
});

describe("a page's facts", () => {
  it("finds emails, phones, its pages and profiles", () => {
    const facts = extractFacts(HOME, "https://www.teide.example/");
    assert.equal(facts.title, "Informática Teide");
    assert.equal(facts.description, "Software & networks for small businesses.");
    assert.deepEqual(facts.emails.sort(), ["ana.perez@teide.example", "info@teide.example"]);
    assert.deepEqual(facts.phones, ["+34 922 123 456"]);
    assert.deepEqual(
      facts.links.map((l) => l.kind),
      ["contact", "jobs"],
    );
    assert.deepEqual(facts.social, ["https://www.linkedin.com/company/teide/"]);
  });
});

describe("reading a site", () => {
  let fake: ReturnType<typeof fakeFetch> | undefined;
  afterEach(() => fake?.restore());

  it("reads the home page and its contact pages, generic emails first", async () => {
    fake = fakeFetch({
      "https://teide.example/robots.txt": () => text("User-agent: *\nDisallow: /trabaja-con-nosotros\n"),
      "https://teide.example/contacto": () => html('<a href="tel:+34922999999">call</a> rrhh@teide.example'),
      "https://teide.example/": () => html(HOME),
    });
    const report = await readSite("teide.example");
    assert.deepEqual(
      report.pages.map((p) => [p.url, p.read]),
      [
        ["https://teide.example/", true],
        ["https://teide.example/contacto", true],
        ["https://teide.example/trabaja-con-nosotros", false],
      ],
    );
    assert.match(report.pages[2]?.note ?? "", /robots\.txt/);
    assert.deepEqual(report.emails[0], { address: "info@teide.example", generic: true });
    assert.equal(report.emails.find((e) => e.address.startsWith("ana"))?.generic, false);
    assert.ok(report.phones.includes("+34922999999"));
    assert.equal(report.about, "Software & networks for small businesses.");
    assert.ok(fake.calls.every((c) => (c.init?.headers as Record<string, string>)["User-Agent"]?.startsWith("work-placements-mcp/")));
  });

  it("follows a redirect to another host, checking that host's robots.txt", async () => {
    fake = fakeFetch({
      "http://old.example/robots.txt": () => text("", 404),
      "http://old.example/": () => new Response(null, { status: 301, headers: { location: "https://new.example/" } }),
      "https://new.example/robots.txt": () => text("User-agent: *\nDisallow: /\n"),
    });
    const report = await readSite("http://old.example/");
    assert.equal(report.url, "https://new.example/");
    assert.equal(report.pages[0]?.read, false);
    assert.match(report.pages[0]?.note ?? "", /robots\.txt asks/);
  });

  it("doesn't read a site whose robots.txt fails", async () => {
    fake = fakeFetch({ "https://down.example/robots.txt": () => text("", 503) });
    const report = await readSite("https://down.example");
    assert.equal(report.pages[0]?.read, false);
    assert.equal(fake.calls.length, 1);
  });

  it("refuses addresses that aren't public sites", () => {
    assert.throws(() => siteUrl("http://localhost:8080"), /isn't a public site/);
    assert.throws(() => siteUrl("http://192.168.1.10/"), /isn't a public site/);
    assert.throws(() => siteUrl("file:///etc/passwd"), /Only http and https/);
  });
});
