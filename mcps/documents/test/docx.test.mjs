// Writes documents from a school-like template and from none, then opens them and checks the package:
// every part well-formed, every style used defined, placeholders filled, lists, tables and images in place.
// With LibreOffice installed, each result is also converted to PDF; without it, that check is skipped.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";
import { readDocx, readTemplate, writeDocx } from "../src/docx.mjs";
import { parseXml } from "../src/xml.mjs";
import { png, templateBytes } from "./fixture.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
let dir;
let template;
let dotx;
let plainTemplate;

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "documents-test-"));
  template = path.join(dir, "plantilla.docx");
  dotx = path.join(dir, "plantilla.dotx");
  plainTemplate = path.join(dir, "sin-marcador.docx");
  writeFileSync(template, templateBytes());
  writeFileSync(dotx, templateBytes({ dotx: true }));
  writeFileSync(plainTemplate, templateBytes({ marker: false }));
  writeFileSync(path.join(dir, "grafico.png"), png(400, 200));
});
after(() => rmSync(dir, { recursive: true, force: true }));

const REPORT = `# Resultados por criterio

Datos leídos el 12/11/2026 del libro de calificaciones de {{curso}}. Más en [la web](https://example.org/?a=1&b=2).

## Primera evaluación

| Criterio | % superado | Media |
|:--|--:|--:|
| RA1.a | 85 % | 6,8 |
| RA1.b | **60 %** | 5,1 |

- Lo que funcionó:
  - Las prácticas guiadas
  - El *proyecto* final
- Lo que cambiar

1. Primera propuesta
2. Segunda propuesta

### Gráfico

![Distribución de notas](grafico.png){width=8cm}

\\pagebreak

> Nota: sin datos individuales.

\`\`\`
total = 24
\`\`\`
`;

/** Opens a .docx and checks every XML part parses, returning the parts as text. */
function openChecked(file) {
  const files = unzipSync(readFileSync(file));
  const parts = {};
  for (const [name, data] of Object.entries(files)) {
    if (!/\.(xml|rels)$/.test(name)) continue;
    parts[name] = strFromU8(data);
    assert.doesNotThrow(() => parseXml(parts[name], name), `${name} is well-formed`);
  }
  return { files, parts };
}

/** The style ids a part references that styles.xml doesn't define. */
function undefinedStyles(parts) {
  const defined = new Set([...parts["word/styles.xml"].matchAll(/<w:style\b[^>]*w:styleId="([^"]*)"/g)].map((m) => m[1]));
  const used = new Set();
  for (const [name, xml] of Object.entries(parts)) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(name)) continue;
    for (const [, id] of xml.matchAll(/<w:(?:pStyle|rStyle|tblStyle) w:val="([^"]*)"/g)) used.add(id);
  }
  return [...used].filter((id) => !defined.has(id));
}

/** soffice on PATH or where LibreOffice installs it, else null. */
function findSoffice() {
  const candidates = ["soffice", "C:\\Program Files\\LibreOffice\\program\\soffice.exe", "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe", "/Applications/LibreOffice.app/Contents/MacOS/soffice", "/usr/bin/soffice", "/usr/bin/libreoffice"];
  for (const c of candidates.slice(1)) if (existsSync(c)) return c;
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", ["soffice"], { stdio: "ignore" });
    return "soffice";
  } catch {
    return null;
  }
}

describe("read_template", () => {
  test("finds the localized styles, the placeholders, the marker, the header and the page", () => {
    const info = readTemplate(template);
    assert.equal(info.roles.heading1.id, "Ttulo1");
    assert.equal(info.roles.heading1.name, "Título 1");
    assert.equal(info.roles.heading2.id, "Ttulo2");
    assert.equal(info.roles.heading3, null);
    assert.equal(info.roles.paragraph.id, "Normal");
    assert.equal(info.roles.listParagraph.id, "Prrafodelista");
    assert.equal(info.roles.table.id, "TablaInstituto");
    assert.equal(info.roles.hyperlink.id, "Hipervnculo");
    assert.deepEqual(info.headingLevels, [1, 2]);
    assert.deepEqual(info.placeholders.body.sort(), ["módulo", "profesor"]);
    assert.deepEqual(info.placeholders.header, ["centro"]);
    assert.deepEqual(info.placeholders.footer, ["curso"]);
    assert.equal(info.contentMarker, "in the body");
    assert.equal(info.header.present, true);
    assert.equal(info.header.images, 1);
    assert.equal(info.page.size, "21 x 29.7 cm");
    assert.equal(info.page.textWidth, "17 cm");
    assert.ok(info.styles.table.some((s) => s.name === "Tabla Instituto"));
  });
});

describe("write_docx", () => {
  let result;
  let out;
  let parts;

  before(() => {
    out = path.join(dir, "salida", "memoria.docx");
    result = writeDocx({ template, markdown: REPORT, imagesDir: dir, output: out, title: "Memoria", values: { "módulo": "Programación", centro: "IES Ejemplo", curso: "2026-2027", profesor: "Ana\nJefa de departamento" } });
    ({ parts } = openChecked(out));
  });

  test("reports what it wrote", () => {
    assert.equal(result.output, out);
    assert.equal(result.content, "at the {{content}} marker");
    assert.equal(result.stylesUsed.heading1, "Título 1");
    assert.equal(result.stylesUsed.table, "Tabla Instituto");
    assert.deepEqual(result.stylesAdded, ["heading 3", "Quote", "HTML Preformatted"]);
    assert.equal(result.counts.tables, 1);
    assert.equal(result.counts.images, 1);
    assert.equal(result.counts.lists, 2);
    assert.equal(result.counts.listItems, 6);
    assert.deepEqual(result.placeholders.left, []);
    assert.deepEqual(result.placeholders.unused, []);
    assert.deepEqual(result.warnings, []);
  });

  test("every part is well-formed and every style it uses is defined", () => {
    assert.deepEqual(undefinedStyles(parts), []);
    assert.deepEqual(readDocx(out).missingStyles, []);
  });

  test("keeps the template around the content and fills the placeholders, split runs too", () => {
    const doc = parts["word/document.xml"];
    assert.ok(!doc.includes("{{"), "no placeholder left in the body");
    const text = readDocx(out).text;
    assert.match(text, /^\[Título 1\] # Memoria de Programación/);
    assert.match(text, /\[Título 1\] # Resultados por criterio/);
    assert.match(text, /\[Título 2\] ## Primera evaluación/);
    assert.match(text, /\[heading 3\] ### Gráfico/);
    assert.match(text, /de 2026-2027\. Más en \[la web\]\(https:\/\/example\.org\/\?a=1&b=2\)/);
    assert.match(text, /Firmado: Ana\nJefa de departamento$/);
    assert.ok(text.indexOf("Texto de ejemplo") < text.indexOf("Resultados por criterio"));
    assert.ok(text.indexOf("Resultados por criterio") < text.indexOf("Firmado"));
    assert.match(parts["word/header1.xml"], /IES Ejemplo/);
    assert.match(parts["word/footer1.xml"], /Curso 2026-2027/);
    assert.match(parts["word/header1.xml"], /r:embed="rIdLogo"/, "the logo stays");
    assert.equal(parts["word/_rels/header1.xml.rels"].includes("media/logo.png"), true);
  });

  test("keeps the section: page, margins, header and footer", () => {
    const doc = parts["word/document.xml"];
    assert.match(doc, /<w:headerReference w:type="default" r:id="rId8"\/>/);
    assert.match(doc, /<w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1134"/);
    assert.match(doc, /<\/w:sectPr><\/w:body>/);
  });

  test("lists use numbering added after the template's own, in schema order", () => {
    const numbering = parts["word/numbering.xml"];
    assert.match(numbering, /w:abstractNumId="0"[\s\S]*w:abstractNumId="1"[\s\S]*w:abstractNumId="2"/);
    const lastAbstract = numbering.lastIndexOf("<w:abstractNum ");
    const firstNum = numbering.search(/<w:num[\s>]/);
    assert.ok(lastAbstract < firstNum, "every w:abstractNum before the first w:num");
    assert.match(numbering, /<w:num w:numId="3"><w:abstractNumId w:val="2"\/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"\/>/);
    assert.match(parts["word/document.xml"], /<w:pStyle w:val="Prrafodelista"\/><w:numPr><w:ilvl w:val="1"\/><w:numId w:val="2"\/>/);
  });

  test("the table takes the template's table style and the text width", () => {
    const doc = parts["word/document.xml"];
    assert.match(doc, /<w:tblStyle w:val="TablaInstituto"\/><w:tblW w:w="(\d+)" w:type="dxa"\/>/);
    const width = Number(doc.match(/<w:tblW w:w="(\d+)"/)[1]);
    assert.ok(width <= 9638 && width > 9600, `table width ${width} fits 17 cm`);
    assert.match(doc, /<w:tblHeader\/>/);
    assert.match(doc, /<w:jc w:val="right"\/>/);
  });

  test("the image is in word/media, related, typed and 8 cm wide", () => {
    const rels = parts["word/_rels/document.xml.rels"];
    const [, id, target] = rels.match(/Id="(rIdDoc\d+)" Type="[^"]*\/image" Target="([^"]+)"/);
    const { files } = openChecked(out);
    assert.ok(files[`word/${target}`], "the media file is there");
    assert.match(parts["[Content_Types].xml"], /Extension="png"/);
    const doc = parts["word/document.xml"];
    assert.match(doc, new RegExp(`r:embed="${id}"`));
    assert.match(doc, /<wp:extent cx="2880000" cy="1440000"\/>/);
    const ids = [...doc.matchAll(/<wp:docPr id="(\d+)"/g)].map((m) => Number(m[1]));
    assert.ok(ids.every((n) => n > 7), "drawing ids above the logo's");
    assert.match(rels, /TargetMode="External"/);
  });

  test("sets the title and a page break", () => {
    assert.match(parts["docProps/core.xml"], /<dc:title>Memoria<\/dc:title>/);
    assert.match(parts["word/document.xml"], /<w:br w:type="page"\/>/);
  });

  test("never overwrites unless asked", () => {
    assert.throws(() => writeDocx({ template, markdown: "x", output: out }), /already exists/);
    const again = writeDocx({ template, markdown: "# Otra", output: out, overwrite: true });
    assert.equal(again.output, out);
  });
});

describe("other templates", () => {
  test("a .dotx gives a .docx", () => {
    const out = path.join(dir, "desde-dotx.docx");
    writeDocx({ template: dotx, markdown: "# Hola", output: out });
    const { parts } = openChecked(out);
    assert.match(parts["[Content_Types].xml"], /wordprocessingml\.document\.main\+xml/);
    assert.doesNotMatch(parts["[Content_Types].xml"], /template\.main/);
  });

  test("without a marker the body is replaced, or kept with append", () => {
    const replaced = path.join(dir, "reemplazado.docx");
    const r = writeDocx({ template: plainTemplate, markdown: "Solo esto.", output: replaced, values: { centro: "IES" } });
    assert.equal(r.content, "replacing the template's body");
    assert.doesNotMatch(readDocx(replaced).text, /Texto de ejemplo/);
    const appended = path.join(dir, "anadido.docx");
    const a = writeDocx({ template: plainTemplate, markdown: "Al final.", output: appended, templateBody: "append" });
    assert.match(readDocx(appended).text, /Texto de ejemplo[\s\S]*Al final\./);
    assert.ok(a.placeholders.left.includes("profesor"));
    assert.ok(a.warnings.some((w) => w.includes("{{profesor}}")));
  });

  test("a style chosen by name for a role", () => {
    const out = path.join(dir, "estilos.docx");
    const r = writeDocx({ template, markdown: "# Título", output: out, styles: { heading1: "Título 2" } });
    assert.equal(r.stylesUsed.heading1, "Título 2");
    assert.throws(() => writeDocx({ template, markdown: "# x", output: path.join(dir, "no.docx"), styles: { heading1: "No existe" } }), /no style "No existe"/);
  });

  test("no template: a clean A4 document with the built-in styles", () => {
    const out = path.join(dir, "limpio.docx");
    const r = writeDocx({ markdown: "# Informe\n\n[toc]\n\n## Uno\n\nTexto.\n\n- a\n- b\n", output: out });
    assert.equal(r.template, "built-in");
    assert.deepEqual(r.stylesAdded, []);
    const { parts } = openChecked(out);
    assert.deepEqual(undefinedStyles(parts), []);
    assert.match(parts["word/settings.xml"], /<w:updateFields w:val="true"\/>/);
    assert.match(parts["word/document.xml"], / TOC \\o "1-3"/);
    const read = readDocx(out);
    assert.equal(read.counts.headings, 2);
    assert.match(read.text, /\[heading 2\] ## Uno/);
  });
});

describe("errors", () => {
  test("refuses what it can't do, with what to do instead", () => {
    assert.throws(() => writeDocx({ markdown: "x", output: "relativo.docx" }), /must be absolute/);
    assert.throws(() => writeDocx({ markdown: "x", output: path.join(dir, "a.pdf") }), /must end in \.docx/);
    assert.throws(() => writeDocx({ output: path.join(dir, "b.docx") }), /markdown .* or as markdownFile/);
    assert.throws(() => writeDocx({ markdown: "![x](https://example.org/a.png)", output: path.join(dir, "c.docx") }), /doesn't download/);
    assert.throws(() => writeDocx({ markdown: "![x](a.png)", output: path.join(dir, "d.docx") }), /relative path/);
    assert.throws(() => writeDocx({ template: path.join(dir, "x.doc"), markdown: "x", output: path.join(dir, "e.docx") }), /No template/);
    writeFileSync(path.join(dir, "x.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
    assert.throws(() => writeDocx({ markdown: "![x](x.svg)", imagesDir: dir, output: path.join(dir, "f.docx") }), /SVG/);
    assert.equal(existsSync(path.join(dir, "f.docx")), false);
  });

  test("a Markdown file, with images relative to it", () => {
    const md = path.join(dir, "informe.md");
    writeFileSync(md, "# Con imagen\n\n![g](grafico.png)\n");
    const r = writeDocx({ markdownFile: md, output: path.join(dir, "g.docx") });
    assert.equal(r.counts.images, 1);
  });
});

describe("LibreOffice", () => {
  test("converts the results to PDF", (t) => {
    const soffice = findSoffice();
    if (!soffice) {
      t.skip("LibreOffice (soffice) isn't installed: no PDF conversion check");
      return;
    }
    const names = ["salida/memoria.docx", "limpio.docx"];
    const outDir = path.join(dir, "pdf");
    execFileSync(soffice, ["--headless", "--norestore", `-env:UserInstallation=file:///${path.join(dir, "lo-profile").replaceAll("\\", "/")}`, "--convert-to", "pdf", "--outdir", outDir, ...names.map((n) => path.join(dir, n))], { stdio: "ignore", timeout: 300000 });
    for (const name of names) {
      const pdf = path.join(outDir, path.basename(name).replace(/\.docx$/, ".pdf"));
      assert.ok(existsSync(pdf), `${pdf} written`);
      assert.equal(readFileSync(pdf).subarray(0, 4).toString(), "%PDF");
      t.diagnostic(`LibreOffice converted ${name} to PDF (${readFileSync(pdf).length} bytes)`);
    }
  });
});

describe("the built server", () => {
  test("lists its four tools over stdio", async (t) => {
    const server = path.join(here, "..", "dist", "server.mjs");
    if (!existsSync(server)) {
      t.skip("dist/server.mjs isn't built: run npm run build");
      return;
    }
    const child = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
    const replies = [];
    let buffer = "";
    const done = new Promise((resolve, reject) => {
      child.stdout.on("data", (chunk) => {
        buffer += chunk;
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.trim()) replies.push(JSON.parse(line));
          if (replies.some((r) => r.id === 2)) resolve();
        }
      });
      child.on("error", reject);
      setTimeout(() => reject(new Error("no reply in 20 s")), 20000);
    });
    const send = (m) => child.stdin.write(`${JSON.stringify(m)}\n`);
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } } });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    try {
      await done;
    } finally {
      child.kill();
    }
    const tools = replies.find((r) => r.id === 2).result.tools;
    assert.deepEqual(tools.map((x) => x.name).sort(), ["read_docx", "read_template", "server_info", "write_docx"]);
    for (const name of ["read_docx", "read_template", "server_info"]) assert.equal(tools.find((x) => x.name === name).annotations.readOnlyHint, true);
    assert.equal(tools.find((x) => x.name === "write_docx").annotations.readOnlyHint, false);
  });
});
