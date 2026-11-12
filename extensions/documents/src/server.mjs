// The documents extension's MCP server: Word documents (.docx) from a template the person brings and Markdown,
// on this computer. Pure JavaScript, no network, nothing to install: bundled into dist/server.mjs.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readDocx, readTemplate, writeDocx } from "./docx.mjs";
import { ROLES } from "./styles.mjs";

const VERSION = "0.1.0";

const server = new McpServer(
  { name: "documents", version: VERSION },
  {
    instructions:
      "Word documents (.docx) on this computer, from a template the person brings (their school's, with its styles, header, footer and logo) and Markdown. Read the template first with read_template, write with write_docx, and check the result with read_docx. It never overwrites a file unless asked, and uploads or sends nothing.",
  },
);

const reply = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const run = (fn) => async (args) => {
  try {
    return reply(await fn(args));
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
};

server.registerTool(
  "read_template",
  {
    title: "Read a Word template",
    description:
      "What a Word template (.docx or .dotx) holds, to write a document in its styles: page size and margins, its header and footer (text, images), the style it uses for each role (title, heading1-6, paragraph, listBullet, listNumber, quote, code, caption, table, hyperlink; null where write_docx would add a built-in one), the heading levels it defines, every style by kind with its id and name (localized names such as \"Título 1\" included), its {{placeholders}} in the body, header and footer, whether it has a {{content}} marker where the document goes, and the first lines of its body. Only reads.",
    inputSchema: { template: z.string().describe("Absolute path to the template, a .docx or .dotx") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  run(({ template }) => readTemplate(template)),
);

server.registerTool(
  "write_docx",
  {
    title: "Write a Word document",
    description:
      "Writes a .docx from a template and Markdown, keeping the template whole (styles, page setup, header, footer, logo) and replacing its body; where the template has a paragraph {{content}}, the document goes there and the rest of its body stays. Markdown: # headings (1-6) in the template's heading styles, paragraphs, **bold**, *italic*, ~~strike~~, `code`, links, bullet and numbered lists (nested too), tables (GFM, with alignment), > quotes, code blocks, images (PNG, JPEG or GIF on this computer, ![alt](path){width=8cm} or a width in cm, mm, in, pt, px or % of the text width; scaled to fit), page breaks (\\pagebreak or <!-- pagebreak -->) and a table of contents ([toc] or <!-- toc -->). {{placeholders}} in the template (or the Markdown) are filled from values, even when Word split them. Styles the template lacks are added as Word's built-in ones and reported. Never overwrites an existing file unless overwrite is true.",
    inputSchema: {
      output: z.string().describe("Absolute path of the .docx to write; its folder is created if missing"),
      template: z.string().optional().describe("Absolute path to the template (.docx or .dotx); without one, a clean A4 document"),
      markdown: z.string().optional().describe("The content, as Markdown (this or markdownFile)"),
      markdownFile: z.string().optional().describe("Absolute path to a Markdown file with the content (this or markdown); its folder is where relative image paths start"),
      values: z.record(z.string(), z.string()).optional().describe("Placeholder values: { \"course\": \"1º DAM\" } fills {{course}}"),
      title: z.string().optional().describe("The document's title in its properties"),
      styles: z
        .record(z.string(), z.string())
        .optional()
        .describe(`A template style (id or name) for a role, over the one found: roles ${ROLES.join(", ")}`),
      templateBody: z.enum(["replace", "append"]).optional().describe("Without a {{content}} marker: replace the template's body (default) or keep it and add the document after it"),
      imagesDir: z.string().optional().describe("Absolute folder that relative image paths start from (default: markdownFile's folder)"),
      overwrite: z.boolean().optional().describe("Replace the output if it exists; only with the person's yes"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  run((args) => writeDocx(args)),
);

server.registerTool(
  "read_docx",
  {
    title: "Read a Word document",
    description:
      "Reads a .docx back to check it: its text as Markdown with each paragraph's style in brackets ([Título 1] # Introduction), tables, images and page breaks; the counts of headings, tables and images; its header and footer text; the {{placeholders}} still unfilled; and the styles it uses that aren't defined in it (Word shows those as Normal). Only reads.",
    inputSchema: {
      document: z.string().describe("Absolute path to the .docx"),
      styles: z.boolean().optional().describe("Show each paragraph's style (default true)"),
      maxChars: z.number().int().min(1000).max(200000).optional().describe("Cut the text after this many characters (default 40000)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  run(({ document, styles, maxChars }) => readDocx(document, { styles: styles ?? true, maxChars: maxChars ?? 40000 })),
);

server.registerTool(
  "server_info",
  {
    title: "About this server",
    description: "This server's version, what it reads and writes, the Markdown it understands and its limits. Only reads.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  run(() => ({
    name: "documents",
    version: VERSION,
    node: process.version,
    reads: [".docx and .dotx templates", ".docx documents"],
    writes: ".docx (Office Open XML), never over an existing file unless overwrite is true",
    markdown: ["headings 1-6", "paragraphs", "bold, italic, strike, inline code, <u>, <sub>, <sup>", "links", "bullet and numbered lists, nested", "GFM tables with alignment", "quotes", "code blocks", "images: PNG, JPEG, GIF, with {width=…}", "page breaks: \\pagebreak, \\newpage, <!-- pagebreak -->", "table of contents: [toc] or <!-- toc -->", "{{placeholders}}"],
    roles: ROLES,
    limits: ["no .doc, .docm or .dotm (save them as .docx first)", "no SVG or WebP images (convert to PNG)", "no images from the web: it downloads nothing", "no footnotes, comments or tracked changes in what it writes"],
  })),
);

await server.connect(new StdioServerTransport());
