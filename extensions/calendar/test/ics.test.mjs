import assert from "node:assert/strict";
import { test } from "node:test";
import ICAL from "ical.js";
import { buildCalendar, escapeText, fold, trigger } from "../src/ics.mjs";
import { readCalendar } from "../src/parse.mjs";
import { vtimezone, wallToUtc } from "../src/tz.mjs";

const plan = {
  timeZone: "Europe/Madrid",
  calendarName: "Plan, 2026; test",
  events: [
    { title: "Maths; algebra, unit 1", start: "2026-09-14T09:00", end: "10:00", repeat: { frequency: "weekly", byDay: ["MO", "WE"], until: "2026-12-18" }, except: ["2026-10-12"], reminders: [15, 1440], location: "Room 3", description: "Line 1\nLine 2, with a long sentence that has to be folded because it's longer than seventy-five octets: ñññ €€€ 😀😀", url: "https://example.org/a?b=1,2" },
    { title: "Exam week", start: "2026-12-01", end: "2026-12-04", reminders: [1440] },
    { title: "Essay due", start: "2026-11-20T23:59", uid: "essay-1@example.org" },
    { title: "Tutoring", start: "2026-10-01T16:00", end: "2026-10-01T17:00", repeat: { frequency: "monthly", byDay: ["1TH"], count: 6 } },
    { title: "Call", start: "2026-11-02T15:00", end: "2026-11-02T15:30", timeZone: "America/New_York" },
    { title: "Server window", start: "2026-11-03T02:00", end: "2026-11-03T03:00", timeZone: "UTC" },
  ],
};

const parse = (text) => {
  const calendar = new ICAL.Component(ICAL.parse(text));
  for (const zone of calendar.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(zone);
  return calendar;
};

test("the file is CRLF, folded at 75 octets, and starts and ends as a VCALENDAR", () => {
  const { text } = buildCalendar(plan);
  assert.ok(text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:"));
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
  assert.equal(text.replace(/\r\n/g, "").includes("\n"), false, "no bare LF");
  for (const line of text.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, `line over 75 octets: ${line}`);
});

test("ical.js reads it: zones, times, all-day ends, repetitions, exceptions and reminders", () => {
  const { text } = buildCalendar(plan);
  const calendar = parse(text);
  const events = calendar.getAllSubcomponents("vevent").map((c) => new ICAL.Event(c));
  assert.equal(events.length, 6);

  const maths = events[0];
  assert.equal(maths.summary, "Maths; algebra, unit 1");
  assert.match(maths.description, /^Line 1\nLine 2, with a long sentence.*😀😀$/);
  assert.equal(maths.startDate.toJSDate().toISOString(), "2026-09-14T07:00:00.000Z"); // CEST
  const seen = [];
  const it = maths.iterator();
  for (let next = it.next(); next; next = it.next()) seen.push(next.toJSDate().toISOString());
  // Mondays and Wednesdays from 14 Sep to 16 Dec (18 Dec is a Friday): 28 days, less 12 Oct.
  assert.equal(seen.length, 28 - 1);
  assert.ok(!seen.includes("2026-10-12T07:00:00.000Z"));
  assert.ok(seen.includes("2026-10-14T07:00:00.000Z"));
  assert.ok(seen.includes("2026-11-02T08:00:00.000Z"), "after the change to CET the class stays at 09:00 local");
  assert.equal(seen.at(-1), "2026-12-16T08:00:00.000Z");
  const alarms = maths.component.getAllSubcomponents("valarm").map((a) => a.getFirstPropertyValue("trigger").toSeconds());
  assert.deepEqual(alarms.sort((a, b) => a - b), [-86400, -900]);

  const exam = events[1];
  assert.ok(exam.startDate.isDate);
  assert.equal(exam.startDate.toString(), "2026-12-01");
  assert.equal(exam.endDate.toString(), "2026-12-05", "exclusive end: the day after the last");

  assert.equal(events[2].uid, "essay-1@example.org");
  assert.equal(events[2].component.getFirstProperty("dtend"), null);

  const tutoring = [];
  const it2 = events[3].iterator();
  for (let next = it2.next(); next; next = it2.next()) tutoring.push(next.toString().slice(0, 10));
  assert.deepEqual(tutoring, ["2026-10-01", "2026-11-05", "2026-12-03", "2027-01-07", "2027-02-04", "2027-03-04"]);

  assert.equal(events[4].startDate.toJSDate().toISOString(), "2026-11-02T20:00:00.000Z"); // EST
  assert.equal(events[5].startDate.toJSDate().toISOString(), "2026-11-03T02:00:00.000Z");
  assert.equal(events[5].startDate.zone, ICAL.Timezone.utcTimezone);
});

test("read_ics gives back what was written", () => {
  const { text, events } = buildCalendar(plan);
  const read = readCalendar(text);
  assert.equal(read.problems, undefined);
  assert.equal(read.total, 6);
  assert.equal(read.calendars[0].name, "Plan, 2026; test");
  assert.deepEqual(read.calendars[0].timeZones, ["Europe/Madrid", "America/New_York"]);
  const [maths, exam] = read.events;
  assert.equal(maths.uid, events[0].uid);
  assert.equal(maths.title, plan.events[0].title);
  assert.equal(maths.description, plan.events[0].description);
  assert.equal(maths.start, "2026-09-14T09:00:00");
  assert.equal(maths.timeZone, "Europe/Madrid");
  assert.equal(maths.repeat.text, "every week on Monday and Wednesday, until 2026-12-18T22:59:59Z");
  assert.deepEqual(maths.except, ["2026-10-12T09:00:00"]);
  assert.deepEqual(maths.reminders.map((r) => r.minutesBefore), [1440, 15]);
  assert.equal(exam.lastDay, "2026-12-04");
  assert.equal(read.events[3].repeat.text, "every month on the first Thursday, 6 times");
});

test("a page at a time", () => {
  const events = Array.from({ length: 7 }, (_, i) => ({ title: `Day ${i}`, start: `2026-01-0${i + 1}` }));
  const { text } = buildCalendar({ events });
  const first = readCalendar(text, { offset: 0, limit: 3 });
  assert.deepEqual([first.events.length, first.nextOffset, first.total], [3, 3, 7]);
  const last = readCalendar(text, { offset: 6, limit: 3 });
  assert.deepEqual([last.events[0].title, last.nextOffset], ["Day 6", null]);
});

test("every problem is reported, and nothing is built", () => {
  assert.throws(() => buildCalendar({ events: [
    { title: "No zone", start: "2026-01-01T10:00" },
    { title: "Backwards", start: "2026-01-01T10:00", end: "09:00", timeZone: "Europe/Madrid" },
    { title: "Bad zone", start: "2026-01-01T10:00", timeZone: "Mars/Olympus" },
    { title: "Bad date", start: "2026-02-30" },
    { title: "Mixed", start: "2026-01-01", end: "2026-01-02T10:00" },
    { title: "Wrong day", start: "2026-01-01", repeat: { frequency: "weekly", byDay: ["MO"] } },
    { title: "Both", start: "2026-01-05", repeat: { frequency: "weekly", count: 3, until: "2026-02-01" } },
    { title: "Lonely except", start: "2026-01-05", except: ["2026-01-12"] },
    { title: "Bad link", start: "2026-01-05", url: "javascript:alert(1)" },
    { title: "Offset", start: "2026-01-05T10:00:00+01:00", timeZone: "UTC" },
  ] }), (error) => {
    for (const fragment of ["No zone", "Backwards", "Mars/Olympus", "2026-02-30", "Mixed", "Wrong day", "count or until", "only goes with repeat", "Bad link", "Offset"]) assert.match(error.message, new RegExp(fragment.replace(/[/]/g, "\\/")));
    return /^Nothing was written/.test(error.message);
  });
});

test("a time the clocks skip is warned about", () => {
  const { warnings } = buildCalendar({ timeZone: "Europe/Madrid", events: [{ title: "Gap", start: "2026-03-29T02:30", end: "2026-03-29T04:00" }] });
  assert.match(warnings[0], /doesn't exist in Europe\/Madrid.*03:30/);
  assert.equal(wallToUtc("Europe/Madrid", { y: 2026, m: 10, d: 25, h: 2, mi: 30, s: 0 }).ms, Date.UTC(2026, 9, 25, 0, 30), "a repeated time is the first one");
});

test("VTIMEZONE: yearly rules where they fit, the zone's offset where there are none", () => {
  const madrid = vtimezone("Europe/Madrid", 2025, 2027).join("\n");
  assert.match(madrid, /RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU/);
  assert.match(madrid, /RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU/);
  const york = vtimezone("America/New_York", 2025, 2027).join("\n");
  assert.match(york, /BYMONTH=3;BYDAY=2SU[\s\S]*TZOFFSETTO:-0400/);
  const kolkata = vtimezone("Asia/Kolkata", 2026, 2027).join("\n");
  assert.match(kolkata, /TZOFFSETTO:\+0530/);
  // Each zone, read by ical.js, gives the offsets Intl gives on a summer and a winter day.
  for (const zone of ["Europe/Madrid", "America/New_York", "Australia/Sydney", "Asia/Kolkata", "America/Santiago", "Pacific/Chatham", "Africa/Casablanca"]) {
    const component = new ICAL.Component(ICAL.parse(["BEGIN:VCALENDAR", ...vtimezone(zone, 2025, 2028), "END:VCALENDAR"].join("\r\n")));
    const tz = new ICAL.Timezone(component.getFirstSubcomponent("vtimezone"));
    for (const [y, m, d, h] of [[2026, 1, 15, 12], [2026, 7, 15, 12], [2027, 3, 1, 9], [2027, 10, 20, 18]]) {
      const local = new ICAL.Time({ year: y, month: m, day: d, hour: h, minute: 0, second: 0 }, tz);
      const expected = wallToUtc(zone, { y, m, d, h, mi: 0, s: 0 }).ms;
      assert.equal(local.toUnixTime() * 1000, expected, `${zone} ${y}-${m}-${d} ${h}:00`);
    }
  }
});

test("escaping, folding and triggers", () => {
  assert.equal(escapeText("a\\b;c,d\ne"), "a\\\\b\\;c\\,d\\ne");
  const folded = fold("DESCRIPTION:" + "é".repeat(80));
  for (const line of folded.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), "DESCRIPTION:" + "é".repeat(80));
  assert.deepEqual([0, 15, 60, 90, 1440, 1500, 10080].map(trigger), ["PT0M", "-PT15M", "-PT1H", "-PT1H30M", "-P1D", "-P1DT1H", "-P1W"]);
});
