import { z } from "zod";
import { CONTENT_TYPES, findContentType, libraryOf } from "../h5p/contentTypes.js";
import { describeFields } from "../h5p/describe.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerListH5pTypes: RegisterTool = (server) => {
  server.registerTool(
    "list_h5p_types",
    {
      title: "List the H5P content types",
      description:
        "List the H5P content types this server builds packages for: each one's library and pinned version, what it's for and, for the types that hold others (Question Set, Course Presentation), the types that go inside (parts). Pass type to get its fields: the shape of the content build_h5p takes for it, with each field's kind, whether it's required, its limits, its options and the HTML tags it allows. Buttons and messages aren't listed: build_h5p fills them in the package's language. Images and other media aren't supported yet. Read the fields of each type before writing its content, and of each part you put inside another.",
      inputSchema: {
        type: z.string().optional().describe("A content type or part, such as H5P.MultiChoice, to get its fields; leave it out for the list"),
      },
      outputSchema: {
        types: z.array(
          z.object({
            type: z.string().describe("The main library's machine name, what build_h5p takes"),
            version: z.string().describe("The pinned version, the one the site must have installed"),
            title: z.string(),
            purpose: z.string(),
            partOnly: z.boolean().optional().describe("Only goes inside another type, never a package of its own"),
            parts: z.array(z.string()).optional().describe("The types that go inside this one"),
            fields: z.array(z.record(z.string(), z.unknown())).optional().describe("The content's fields: a group's under fields, a list's item under item"),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ type }) => {
      const chosen = type === undefined ? CONTENT_TYPES : [findContentType(type)].filter((t) => t !== undefined);
      if (!chosen.length) throw new Error(`${type} isn't a content type this server knows: call list_h5p_types without type for the list.`);
      return reply({
        types: chosen.map((t) => {
          const library = libraryOf(t);
          return {
            type: t.machineName,
            version: `${library.majorVersion}.${library.minorVersion}`,
            title: library.title,
            purpose: t.purpose,
            ...(t.partOnly ? { partOnly: true } : {}),
            ...(t.parts ? { parts: t.parts } : {}),
            ...(type !== undefined ? { fields: describeFields(library.semantics) as unknown as Record<string, unknown>[] } : {}),
          };
        }),
      });
    },
  );
};
