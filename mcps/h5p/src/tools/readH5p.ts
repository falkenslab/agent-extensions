import { z } from "zod";
import { findContentType, libraryOf } from "../h5p/contentTypes.js";
import { readPackage } from "../h5p/package.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerReadH5p: RegisterTool = (server) => {
  server.registerTool(
    "read_h5p",
    {
      title: "Read an H5P package",
      description:
        "Read what a local .h5p package holds: its type and version, title, language and its content, in the same shape build_h5p takes, so it can be reviewed, or changed and built again with build_h5p. Packages that bring their libraries are read too (their content only; libraries lists them). supported says whether build_h5p builds this type at this version. Only reads.",
      inputSchema: {
        path: z.string().describe("The .h5p file (absolute path)"),
      },
      outputSchema: {
        path: z.string(),
        type: z.string().describe("The main library, such as H5P.MultiChoice"),
        version: z.string().optional(),
        title: z.string(),
        language: z.string(),
        supported: z.boolean().describe("build_h5p builds this type at this version"),
        content: z.record(z.string(), z.unknown()),
        libraries: z.array(z.string()).optional().describe("Libraries the package brings with it"),
        media: z.array(z.string()).optional().describe("Files under content/ besides content.json"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path }) => {
      const pkg = await readPackage(path);
      const type = findContentType(pkg.mainLibrary);
      const library = type && !type.partOnly ? libraryOf(type) : undefined;
      return reply({
        path,
        type: pkg.mainLibrary,
        ...(pkg.version ? { version: pkg.version } : {}),
        title: pkg.title,
        language: pkg.language,
        supported: !!library && pkg.version === `${library.majorVersion}.${library.minorVersion}`,
        content: pkg.content as Record<string, unknown>,
        ...(pkg.libraries.length ? { libraries: pkg.libraries } : {}),
        ...(pkg.media.length ? { media: pkg.media } : {}),
      });
    },
  );
};
