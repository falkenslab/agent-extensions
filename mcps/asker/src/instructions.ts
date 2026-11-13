/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them.
 * Generic: no client, agent or institution is named here.
 */
export const INSTRUCTIONS = `- This server runs Asker, which makes quiz questions from a definitions file. The file is the source: write or change one only from what the person gives, and have them review it before generating; never add facts of your own to it.
- Read asker_input_reference before writing an input, then check_input after every change, until it loads with no errors.
- generate_questions writes files: say where first, and overwrite only with the person's yes. Asker chooses questions at random, so each run differs.
- Review before importing: read_questions shows each question with its answers; exclude_questions writes a copy without the ones the person leaves out. No question goes into a course without the person having seen it.
- Prefer Moodle XML for importing: it's complete. Asker's GIFT can't hold drag-and-drop matching.
- Tools annotated read-only only read. check_requirements says how to install Ruby and Asker when they're missing; server_info helps when something fails.`;
