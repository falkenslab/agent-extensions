import { z } from "zod";
import { buildPackage } from "../h5p/build.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerBuildH5p: RegisterTool = (server) => {
  server.registerTool(
    "build_h5p",
    {
      title: "Build an H5P package",
      description:
        "Build a content-only .h5p package (h5p.json and content/content.json, no libraries) from content written for one of list_h5p_types' types, in the shape its fields give. The content is checked first, with the rules a site applies when it deploys the package (required fields, kinds, limits, the HTML tags each text allows) and the type's own (a multiple choice with a right answer, a blank with its answer…); if anything is wrong nothing is written and the error lists what to fix. Plain text is escaped; where a field takes HTML, simple HTML with its allowed tags may be used. Buttons and messages are filled in the package's language. Writes <destDir>/<name>.h5p and, unless preview is false, <name>.preview.html next to it: the content as a page to review before uploading. Confirm with the person before overwriting. The package plays only on a site with that type installed at that version; uploading it is another tool's job.",
      inputSchema: {
        type: z.string().describe("The content type, such as H5P.MultiChoice (from list_h5p_types)"),
        title: z.string().describe("The package's title, as the site will show it"),
        language: z.string().describe("The content's language code, such as es or en: its buttons and messages come in it"),
        content: z.record(z.string(), z.unknown()).describe("The content, in the shape list_h5p_types gives for the type"),
        destDir: z.string().describe("An existing folder to write the package in (absolute path)"),
        name: z.string().optional().describe("The file name without .h5p; by default made from the title"),
        overwrite: z.boolean().optional().describe("Replace the package and preview if they exist; only once the person agrees"),
        preview: z.boolean().optional().describe("Write the HTML preview next to the package (default true)"),
      },
      outputSchema: {
        path: z.string().describe("The package written"),
        preview: z.string().optional().describe("The HTML preview written next to it"),
        type: z.string(),
        version: z.string().describe("The type's version the site must have"),
        title: z.string(),
        language: z.string(),
        warnings: z.array(z.string()).describe("What the person should know, such as texts left in English"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (input) => reply({ ...(await buildPackage(input)) }),
  );
};
