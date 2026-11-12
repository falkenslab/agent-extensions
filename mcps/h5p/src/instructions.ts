/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them.
 * Generic: no client, agent or institution is named here.
 */
export const INSTRUCTIONS = `- Each tool is a task in this server's domain: use the one that fits; its description says what it needs and what it returns.
- Tools annotated read-only only read. Any tool that changes something says so in its annotations and description; confirm with the person before calling one.
- To make an H5P package: list_h5p_types for the types, then with a type for its fields (and for each part you put inside another); write the content in that shape and build it with build_h5p. If it's refused, fix what the error lists and build again. Tell the person where the package and its preview are, and that it plays only on a site with that type at that version.
- read_h5p gives a package's content in the shape build_h5p takes: to review it, or to change it and build it again.
- server_info shows this server's version and configuration, useful when something fails.`;
