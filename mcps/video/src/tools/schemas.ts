// Input and output schemas shared by the tools.
import { z } from "zod";

export const sourceSchema = z
  .string()
  .min(1)
  .describe("The video: an absolute path to a file on this computer, or an http(s) address (a YouTube video, or another page or file yt-dlp reads). A video on a Moodle site is downloaded first with moodle-mcp's download_file, then given here as a file");

export const languageSchema = z
  .string()
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/, "a language code: es, en, pt-BR")
  .optional();

export const pageInput = {
  offset: z.number().int().min(0).optional().describe("The paragraph to start at: the previous page's next. 0 by default"),
  maxChars: z.number().int().min(2000).max(100_000).optional().describe("The longest page, in characters: 40000 by default"),
};

export const pageOutput = {
  text: z.string().describe("The transcript, a paragraph per line: [mm:ss] what's said"),
  paragraphs: z.number().describe("How many paragraphs there are in all"),
  offset: z.number(),
  next: z.number().optional().describe("The offset of the next page, when there's more: call again with it"),
};

export const chapterSchema = z.object({ start: z.number(), at: z.string().describe("mm:ss"), title: z.string() });

export const absolutePath = (what: string) => z.string().min(1).describe(`${what}: an absolute path on this computer`);
