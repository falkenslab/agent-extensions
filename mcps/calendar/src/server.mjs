// The calendar extension's MCP server: events in, an iCalendar (.ics) file out, and an .ics read back as
// data. Local files only: no network, no settings.
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildCalendar, VERSION, PRODID } from "./ics.mjs";
import { readCalendar } from "./parse.mjs";

const MAX_READ = 20 * 1024 * 1024;

const server = new McpServer(
  { name: "calendar", version: VERSION },
  { instructions: "Calendar files (.ics, iCalendar): write_ics turns events into a file the person imports into Google Calendar, Outlook or Apple Calendar, with time zones, all-day events, repetitions and reminders; read_ics shows what an .ics holds. Times are wall-clock times in the person's IANA time zone." },
);

const reply = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const failure = (message) => ({ isError: true, content: [{ type: "text", text: message }] });

const when = "YYYY-MM-DD for an all-day event, or YYYY-MM-DDTHH:MM (seconds optional) as a wall-clock time in the event's time zone, with no offset or Z";

const event = z.strictObject({
  title: z.string().min(1).max(500).describe("What the event is, as the calendar shows it (SUMMARY)"),
  start: z.string().describe(`When it starts: ${when}. A date alone makes it an all-day event`),
  end: z.string().optional().describe("When it ends. All-day: its last day (YYYY-MM-DD, included; the file gets the day after, as RFC 5545 asks), one day if left out. Timed: YYYY-MM-DDTHH:MM, or HH:MM on the start's day; left out, it's a point in time (a deadline)"),
  timeZone: z.string().optional().describe("This event's IANA time zone, when it differs from the file's timeZone"),
  description: z.string().max(20000).optional().describe("Notes shown with the event; line breaks are kept"),
  location: z.string().max(1000).optional().describe("Where it is: a room, an address, or a video call's name"),
  url: z.string().max(2000).optional().describe("A link for the event (https:// or mailto:)"),
  uid: z.string().max(255).optional().describe("A stable id: give the uid read_ics or a previous write_ics returned, so re-importing updates the event instead of duplicating it in apps that match by uid. Made up when left out"),
  repeat: z.strictObject({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().min(1).max(999).optional().describe("Every how many days, weeks, months or years (1 if left out)"),
    count: z.number().int().min(1).max(1000).optional().describe("How many times it happens in all, the first included"),
    until: z.string().optional().describe("The last day it may happen (YYYY-MM-DD, included) or a time; count or until, not both"),
    byDay: z.array(z.string()).max(31).optional().describe("Weekdays: MO, TU, WE, TH, FR, SA, SU; monthly or yearly ones may take a position: 1MO (first Monday), -1FR (last Friday). The start must be one of them"),
  }).optional().describe("How it repeats (RRULE). The start is the first occurrence"),
  except: z.array(z.string()).max(500).optional().describe("Days a repeating event doesn't happen (EXDATE): dates (YYYY-MM-DD), or times at its start time"),
  reminders: z.array(z.number().int().min(0).max(40320)).max(10).optional().describe("Reminders, in minutes before it starts (0 = when it starts, 1440 = a day before); for all-day events, before midnight of its first day"),
});

server.registerTool(
  "write_ics",
  {
    title: "Write a calendar file",
    description: "Writes events to an iCalendar (.ics) file (RFC 5545) that Google Calendar, Outlook and Apple Calendar import: timed events in the person's IANA time zone (with its VTIMEZONE) or UTC, all-day events, repetitions with exceptions, and reminders. Everything is checked first; when something is wrong nothing is written and every problem is listed. Never replaces an existing file unless overwrite is true. Returns each event's uid.",
    inputSchema: {
      path: z.string().describe("Absolute path of the .ics file to write; its folder must exist"),
      events: z.array(event).min(1).max(2000),
      timeZone: z.string().optional().describe("The IANA time zone of the timed events' times (the person's, like Europe/Madrid), or UTC; needed when there are timed events"),
      calendarName: z.string().max(200).optional().describe("A name for the calendar, which some apps show (X-WR-CALNAME)"),
      calendarDescription: z.string().max(2000).optional().describe("What the calendar is (X-WR-CALDESC)"),
      overwrite: z.boolean().default(false).describe("Replace the file if it exists: only with the person's yes"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ path: file, events, timeZone, calendarName, calendarDescription, overwrite }) => {
    if (!path.isAbsolute(file)) return failure(`path must be absolute (it was ${file}).`);
    if (!/\.ics$/i.test(file)) return failure(`path must end in .ics (it was ${file}).`);
    const folder = path.dirname(file);
    if (!existsSync(folder) || !statSync(folder).isDirectory()) return failure(`The folder ${folder} doesn't exist: choose an existing one, or ask the person to create it.`);
    if (existsSync(file) && !overwrite) return failure(`${file} already exists. Choose another name, or, only if the person says to replace it, call again with overwrite: true.`);
    let built;
    try {
      built = buildCalendar({ events, timeZone, calendarName, calendarDescription });
    } catch (error) {
      return failure(error.message);
    }
    try {
      writeFileSync(file, built.text, { encoding: "utf8", flag: overwrite ? "w" : "wx" });
    } catch (error) {
      return failure(error.code === "EEXIST" ? `${file} already exists: choose another name, or call again with overwrite: true if the person says to replace it.` : `Couldn't write ${file}: ${error.message}`);
    }
    return reply({ path: file, bytes: Buffer.byteLength(built.text), events: built.events, ...(built.warnings.length ? { warnings: built.warnings } : {}) });
  },
);

server.registerTool(
  "read_ics",
  {
    title: "Read a calendar file",
    description: "Reads an iCalendar (.ics) file: its calendars (name, product, time zones) and its events as data (title, start, end, all-day and the last day, time zone, description, location, link, uid, repetitions in words, exceptions, reminders in minutes before), with any problems found. Large files come a page at a time: call again with nextOffset.",
    inputSchema: {
      path: z.string().describe("Absolute path of the .ics file"),
      offset: z.number().int().min(0).default(0).describe("The first event to return (0 is the first)"),
      limit: z.number().int().min(1).max(200).default(50).describe("How many events at most"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ path: file, offset, limit }) => {
    if (!path.isAbsolute(file)) return failure(`path must be absolute (it was ${file}).`);
    if (!existsSync(file) || !statSync(file).isFile()) return failure(`There's no file at ${file}.`);
    if (statSync(file).size > MAX_READ) return failure(`${file} is larger than 20 MB: not read.`);
    return reply({ path: file, ...readCalendar(readFileSync(file, "utf8"), { offset, limit }) });
  },
);

server.registerTool(
  "server_info",
  {
    title: "Calendar server info",
    description: "The calendar server's version, the iCalendar it writes, and its limits.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => reply({
    name: "calendar",
    version: VERSION,
    prodid: PRODID,
    writes: "iCalendar 2.0 (RFC 5545): VEVENT with UID, DTSTAMP, SUMMARY, DESCRIPTION, LOCATION, URL; TZID times with an embedded VTIMEZONE, or UTC; all-day events as dates; RRULE (FREQ, INTERVAL, COUNT or UNTIL, BYDAY) and EXDATE; VALARM DISPLAY reminders; CRLF lines folded at 75 octets.",
    limits: { eventsPerFile: 2000, remindersPerEvent: 10, readMaxBytes: MAX_READ, readPageMax: 200 },
    node: process.version,
  }),
);

await server.connect(new StdioServerTransport());
