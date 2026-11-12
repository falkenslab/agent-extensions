// Writing an iCalendar file (RFC 5545) from events: checked first, every problem reported at once.
import { randomUUID } from "node:crypto";
import { isUtc, vtimezone, wallAt, wallToUtc, zoneProblem } from "./tz.mjs";

export const VERSION = "0.1.0";
export const PRODID = `-//Falken's Lab//calendar ${VERSION}//EN`;

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const pad = (n, size = 2) => String(n).padStart(size, "0");

/** A date (YYYY-MM-DD) or a wall-clock time (YYYY-MM-DDTHH:MM[:SS]), or null when it's neither or no real day. */
export function parseWhen(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(text).trim());
  if (!match) return null;
  const [y, m, d] = [+match[1], +match[2], +match[3]];
  const day = new Date(Date.UTC(y, m - 1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d || y < 1900 || y > 2200) return null;
  if (match[4] === undefined) return { date: true, y, m, d, h: 0, mi: 0, s: 0 };
  const [h, mi, s] = [+match[4], +match[5], +(match[6] ?? 0)];
  if (h > 23 || mi > 59 || s > 59) return null;
  return { date: false, y, m, d, h, mi, s };
}

const dateStamp = (w) => `${pad(w.y, 4)}${pad(w.m)}${pad(w.d)}`;
const timeStamp = (w) => `${dateStamp(w)}T${pad(w.h)}${pad(w.mi)}${pad(w.s)}`;
const utcStamp = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};
const addDays = (w, n) => {
  const d = new Date(Date.UTC(w.y, w.m - 1, w.d + n));
  return { ...w, y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};
const sortKey = (w) => timeStamp(w);
const weekday = (w) => new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay();
const show = (w) => (w.date ? `${pad(w.y, 4)}-${pad(w.m)}-${pad(w.d)}` : `${pad(w.y, 4)}-${pad(w.m)}-${pad(w.d)}T${pad(w.h)}:${pad(w.mi)}`);

/** TEXT as RFC 5545 escapes it: backslash, semicolon, comma and line breaks. */
export const escapeText = (text) => String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");

/** A content line folded at 75 octets (never inside a character), continuation lines starting with a space. */
export function fold(line) {
  const out = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 75) {
      out.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n");
}

/** A reminder's minutes before the start as a negative DURATION: -PT15M, -P1D, -P1DT2H, -P2W. */
export function trigger(minutes) {
  if (minutes === 0) return "PT0M";
  if (minutes % 10080 === 0) return `-P${minutes / 10080}W`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  let time = "";
  if (hours || mins) time = "T" + (hours ? `${hours}H` : "") + (mins ? `${mins}M` : "");
  return `-P${days ? `${days}D` : ""}${time}`;
}

/** Whether a day matches a BYDAY item (MO, 2TU, -1FR) within its month (monthly) or by weekday only. */
function dayMatches(w, item, frequency) {
  const [, ordinal, day] = /^([+-]?\d{1,2})?([A-Z]{2})$/.exec(item);
  if (DAYS[weekday(w)] !== day) return false;
  if (!ordinal || frequency !== "monthly") return true;
  const n = +ordinal;
  const daysInMonth = new Date(Date.UTC(w.y, w.m, 0)).getUTCDate();
  return n > 0 ? Math.ceil(w.d / 7) === n : Math.floor((daysInMonth - w.d) / 7) + 1 === -n;
}

/** How many years past its start a repetition with a COUNT reaches, at most, for the VTIMEZONE's range. */
function countYears(repeat) {
  const per = { daily: 1 / 365, weekly: 7 / 365, monthly: 1 / 12, yearly: 1 }[repeat.frequency];
  return Math.min(30, Math.ceil(repeat.count * (repeat.interval ?? 1) * per) + 1);
}

/**
 * Checks the events and builds the file's text (CRLF lines). Throws an Error listing every problem found.
 * Returns { text, events: [{ uid, title, start }], warnings }.
 */
export function buildCalendar({ events, timeZone, calendarName, calendarDescription, now = Date.now() }) {
  const problems = [];
  const warnings = [];
  if (timeZone !== undefined) {
    const problem = zoneProblem(timeZone);
    if (problem) problems.push(`timeZone: ${problem}`);
  }
  const years = new Map(); // zone → [min year, max year]
  const cover = (zone, from, to) => {
    const [a, b] = years.get(zone) ?? [from, to];
    years.set(zone, [Math.min(a, from), Math.max(b, to)]);
  };
  const built = [];
  const uids = new Set();

  events.forEach((event, index) => {
    const where = `event ${index + 1} ("${event.title}")`;
    const fail = (message) => problems.push(`${where}: ${message}`);
    const start = parseWhen(event.start);
    if (!start) return fail(`start "${event.start}" isn't a real date (YYYY-MM-DD) or time (YYYY-MM-DDTHH:MM, local to its zone, with no offset or Z)`);
    const allDay = start.date;
    let zone = null;
    if (!allDay) {
      zone = event.timeZone ?? timeZone;
      if (!zone) return fail("a timed event needs a time zone: give the person's IANA zone as timeZone (for the file or this event), or UTC");
      const problem = event.timeZone !== undefined ? zoneProblem(zone) : null;
      if (problem) return fail(`timeZone: ${problem}`);
      if (zoneProblem(zone)) return; // the file's zone is already reported
    } else if (event.timeZone !== undefined) {
      warnings.push(`${where}: an all-day event belongs to no time zone; its timeZone was left out`);
    }

    let end = null;
    if (event.end !== undefined) {
      const timeOnly = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(event.end).trim());
      end = timeOnly && !allDay ? parseWhen(`${show({ ...start, date: true })}T${timeOnly[1]}:${timeOnly[2]}:${timeOnly[3] ?? "00"}`) : parseWhen(event.end);
      if (!end) return fail(`end "${event.end}" isn't a real date or time`);
      if (end.date !== allDay) return fail(allDay ? "an all-day event ends on a date (its last day, YYYY-MM-DD), not at a time" : "a timed event ends at a time (YYYY-MM-DDTHH:MM, or HH:MM on the same day), not on a date");
      if (allDay && sortKey(end) < sortKey(start)) return fail(`its last day ${event.end} is before its first ${event.start}`);
      if (!allDay && sortKey(end) <= sortKey(start)) return fail(`it ends (${show(end)}) before or when it starts (${show(start)})`);
    }

    if (event.url !== undefined) {
      try {
        const url = new URL(event.url);
        if (!/^(https?|mailto):$/.test(url.protocol)) return fail(`url must be an http(s) or mailto link, not ${url.protocol}`);
      } catch {
        return fail(`url "${event.url}" isn't a full link (https://…)`);
      }
    }
    if (event.uid !== undefined && !/^[\x21-\x7e]{1,255}$/.test(event.uid)) return fail("uid must be printable ASCII without spaces, at most 255 characters");
    const uid = event.uid ?? `${randomUUID()}@calendar.falkenslab`;
    if (uids.has(uid)) return fail(`uid ${uid} is already another event's: each event needs its own`);
    uids.add(uid);

    // When a time in its zone is: written with its TZID, or with a Z in UTC; all-day ones as dates.
    const utc = zone && isUtc(zone);
    const stamp = (w) => (allDay ? `;VALUE=DATE:${dateStamp(w)}` : utc ? `:${timeStamp(w)}Z` : `;TZID=${zone}:${timeStamp(w)}`);
    if (!allDay && !utc) {
      for (const [name, w] of [["start", start], ["end", end]]) {
        if (w && !wallToUtc(zone, w).exists) {
          const real = wallAt(zone, wallToUtc(zone, w).ms);
          warnings.push(`${where}: ${show(w)} doesn't exist in ${zone} (the clocks skip it), so its ${name} will show as ${show({ ...real, date: false })}`);
        }
      }
    }

    let lastYear = (end ?? start).y;
    const lines = ["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${utcStamp(now)}`, `DTSTART${stamp(start)}`];
    if (allDay) lines.push(`DTEND;VALUE=DATE:${dateStamp(addDays(end ?? start, 1))}`);
    else if (end) lines.push(`DTEND${stamp(end)}`);

    const repeat = event.repeat;
    if (repeat) {
      if (repeat.count !== undefined && repeat.until !== undefined) return fail("repeat takes count or until, not both");
      const parts = [`FREQ=${repeat.frequency.toUpperCase()}`];
      if (repeat.interval && repeat.interval > 1) parts.push(`INTERVAL=${repeat.interval}`);
      if (repeat.byDay?.length) {
        const items = repeat.byDay.map((item) => String(item).trim().toUpperCase());
        const bad = items.filter((item) => !/^([+-]?(?:[1-9]|[1-4]\d|5[0-3]))?(MO|TU|WE|TH|FR|SA|SU)$/.test(item));
        if (bad.length) return fail(`repeat.byDay ${bad.join(", ")}: use two-letter days (MO, TU, WE, TH, FR, SA, SU), with a position for monthly ones (1MO, -1FR)`);
        if (repeat.frequency !== "monthly" && repeat.frequency !== "yearly" && items.some((item) => /\d/.test(item))) return fail("repeat.byDay takes a position (1MO, -1FR) only when the frequency is monthly or yearly");
        if (repeat.frequency === "daily") return fail("repeat.byDay with a daily frequency: use weekly with those days instead");
        if (repeat.frequency !== "yearly" && !items.some((item) => dayMatches(start, item, repeat.frequency))) {
          return fail(`it starts on a ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday(start)]} (${show(start)}), which repeat.byDay (${items.join(", ")}) doesn't include: start it on its first real occurrence`);
        }
        parts.push(`BYDAY=${items.join(",")}`);
      }
      if (repeat.count !== undefined) {
        parts.push(`COUNT=${repeat.count}`);
        lastYear = start.y + countYears(repeat);
      } else if (repeat.until !== undefined) {
        const until = parseWhen(repeat.until);
        if (!until) return fail(`repeat.until "${repeat.until}" isn't a real date or time`);
        if (allDay && !until.date) return fail("an all-day event's repeat.until is a date (its last day), not a time");
        // The last day it may happen on, whole: its end, for a timed event (UNTIL is then UTC, as RFC 5545 asks).
        const last = until.date && !allDay ? { ...until, date: false, h: 23, mi: 59, s: 59 } : until;
        if (sortKey(last) < sortKey(start)) return fail(`repeat.until ${repeat.until} is before it starts`);
        parts.push(`UNTIL=${allDay ? dateStamp(last) : utc ? `${timeStamp(last)}Z` : utcStamp(wallToUtc(zone, last).ms)}`);
        lastYear = until.y;
      } else {
        warnings.push(`${where}: it repeats with no end (no count or until)`);
        lastYear = start.y + 10;
      }
      lines.push(`RRULE:${parts.join(";")}`);
    }

    if (event.except?.length) {
      if (!repeat) return fail("except (dates it doesn't happen) only goes with repeat");
      const stamps = [];
      for (const text of event.except) {
        const day = parseWhen(text);
        if (!day) return fail(`except "${text}" isn't a real date or time`);
        if (sortKey(day) < sortKey({ ...start, h: 0, mi: 0, s: 0 })) return fail(`except ${text} is before it starts`);
        // A date in a timed event's list means that day's occurrence, at its start time.
        const w = day.date && !allDay ? { ...day, date: false, h: start.h, mi: start.mi, s: start.s } : day;
        if (allDay && !day.date) return fail(`except ${text}: an all-day event's exceptions are dates`);
        if (!allDay && (w.h !== start.h || w.mi !== start.mi || w.s !== start.s)) warnings.push(`${where}: except ${text} isn't at its start time (${pad(start.h)}:${pad(start.mi)}), so it may match no occurrence`);
        stamps.push(allDay ? dateStamp(w) : utc ? `${timeStamp(w)}Z` : timeStamp(w));
        lastYear = Math.max(lastYear, w.y);
      }
      lines.push(`EXDATE${allDay ? ";VALUE=DATE" : utc ? "" : `;TZID=${zone}`}:${stamps.join(",")}`);
    }

    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    for (const minutes of [...new Set(event.reminders ?? [])].sort((a, b) => b - a)) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(event.title)}`, `TRIGGER:${trigger(minutes)}`, "END:VALARM");
    }
    if (allDay && event.reminders?.length) warnings.push(`${where}: an all-day event's reminders count from midnight at its start (1440 is midnight the day before; apps may show them their own way)`);
    lines.push("END:VEVENT");

    if (zone && !utc) cover(zone, start.y - 1, lastYear + 1);
    built.push({ lines, summary: { uid, title: event.title, start: show(start), ...(end ? { end: show(end) } : {}), allDay, ...(zone ? { timeZone: zone } : {}) } });
  });

  if (problems.length) throw new Error(`Nothing was written. Fix these and call again:\n- ${problems.join("\n- ")}`);

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (calendarName) lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);
  if (calendarDescription) lines.push(`X-WR-CALDESC:${escapeText(calendarDescription)}`);
  if (timeZone && !isUtc(timeZone)) lines.push(`X-WR-TIMEZONE:${timeZone}`);
  for (const [zone, [from, to]] of years) lines.push(...vtimezone(zone, from, to));
  for (const event of built) lines.push(...event.lines);
  lines.push("END:VCALENDAR");
  return { text: lines.map(fold).join("\r\n") + "\r\n", events: built.map((event) => event.summary), warnings };
}
