// Reading an iCalendar file (RFC 5545) back as data: lines unfolded, text unescaped, repetitions described.

/** TEXT unescaped: \n, \, , \; and \\. */
export const unescapeText = (text) => text.replace(/\\([nN,;\\])/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));

/** One content line as { name, params, value }, or null when it has no name and value. */
export function parseLine(line) {
  let i = 0;
  let quoted = false;
  const cut = [];
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === ";" || c === ":")) {
      cut.push(i);
      if (c === ":") break;
    }
  }
  if (i >= line.length) return null;
  const name = line.slice(0, cut[0]).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(name)) return null;
  const params = {};
  for (let k = 0; k < cut.length - 1; k++) {
    const raw = line.slice(cut[k] + 1, cut[k + 1]);
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    params[raw.slice(0, eq).toUpperCase()] = raw.slice(eq + 1).replace(/^"(.*)"$/, "$1");
  }
  return { name, params, value: line.slice(i + 1) };
}

/** The components of a file, as a tree of { name, props, children }, and what's wrong with its structure. */
export function parseTree(text) {
  const lines = text.replace(/^﻿/, "").replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const root = { name: "ROOT", props: [], children: [] };
  const stack = [root];
  const problems = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const parsed = parseLine(line);
    if (!parsed) {
      if (problems.length < 20) problems.push(`line ${index + 1} isn't a property (NAME:value): ${line.slice(0, 60)}`);
      return;
    }
    const top = stack[stack.length - 1];
    if (parsed.name === "BEGIN") {
      const component = { name: parsed.value.toUpperCase(), props: [], children: [] };
      top.children.push(component);
      stack.push(component);
    } else if (parsed.name === "END") {
      if (top.name !== parsed.value.toUpperCase() || stack.length === 1) problems.push(`line ${index + 1}: END:${parsed.value} doesn't close ${top.name === "ROOT" ? "anything" : `BEGIN:${top.name}`}`);
      else stack.pop();
    } else {
      top.props.push(parsed);
    }
  });
  if (stack.length > 1) problems.push(`BEGIN:${stack[stack.length - 1].name} is never closed`);
  return { root, problems };
}

const prop = (component, name) => component.props.find((p) => p.name === name);
const props = (component, name) => component.props.filter((p) => p.name === name);
const text = (component, name) => {
  const p = prop(component, name);
  return p ? unescapeText(p.value) : undefined;
};

/** A DATE or DATE-TIME value as readable text, and whether it's a date. */
export function readWhen(p) {
  if (!p) return undefined;
  return p.value.split(",").map((value) => {
    const v = value.trim();
    const date = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    if (date) return { value: `${date[1]}-${date[2]}-${date[3]}`, date: true };
    const time = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
    if (time) return { value: `${time[1]}-${time[2]}-${time[3]}T${time[4]}:${time[5]}:${time[6]}${time[7]}`, date: false, ...(time[7] ? { timeZone: "UTC" } : p.params.TZID ? { timeZone: p.params.TZID } : { floating: true }) };
    return { value: v, date: false, unreadable: true };
  });
}

const DAY_NAMES = { MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday", SU: "Sunday" };
const ORDINALS = ["", "first", "second", "third", "fourth", "fifth"];
const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const UNITS = { SECONDLY: ["second", "seconds"], MINUTELY: ["minute", "minutes"], HOURLY: ["hour", "hours"], DAILY: ["day", "days"], WEEKLY: ["week", "weeks"], MONTHLY: ["month", "months"], YEARLY: ["year", "years"] };

const list = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
function dayName(item) {
  const [, n, day] = /^([+-]?\d{1,2})?([A-Z]{2})$/.exec(item) ?? [];
  if (!day) return item;
  if (!n) return DAY_NAMES[day] ?? day;
  const k = +n;
  if (k === -1) return `the last ${DAY_NAMES[day]}`;
  if (k < 0) return `the ${ORDINALS[-k] ?? `${-k}th`} to last ${DAY_NAMES[day]}`;
  return `the ${ORDINALS[k] ?? `${k}th`} ${DAY_NAMES[day]}`;
}

/** An RRULE as its parts and in words: "every 2 weeks on Monday and Wednesday, 10 times". */
export function describeRule(value) {
  const parts = Object.fromEntries(value.split(";").filter(Boolean).map((part) => {
    const eq = part.indexOf("=");
    return [part.slice(0, eq).toUpperCase(), part.slice(eq + 1)];
  }));
  const unit = UNITS[parts.FREQ] ?? [String(parts.FREQ).toLowerCase(), String(parts.FREQ).toLowerCase()];
  const interval = parts.INTERVAL ? +parts.INTERVAL : 1;
  let words = interval > 1 ? `every ${interval} ${unit[1]}` : `every ${unit[0]}`;
  if (parts.BYMONTH) words += ` in ${list(parts.BYMONTH.split(",").map((m) => MONTHS[+m] ?? m))}`;
  if (parts.BYMONTHDAY) words += ` on day ${list(parts.BYMONTHDAY.split(","))}`;
  if (parts.BYDAY) words += ` on ${list(parts.BYDAY.split(",").map(dayName))}`;
  const until = parts.UNTIL ? readWhen({ value: parts.UNTIL, params: {} })[0].value : undefined;
  if (parts.COUNT) words += `, ${parts.COUNT} times`;
  else if (until) words += `, until ${until}`;
  else words += ", with no end";
  const other = Object.keys(parts).filter((key) => !["FREQ", "INTERVAL", "BYMONTH", "BYMONTHDAY", "BYDAY", "COUNT", "UNTIL", "WKST"].includes(key));
  if (other.length) words += ` (also ${other.map((key) => `${key}=${parts[key]}`).join(";")})`;
  return {
    rule: value,
    frequency: String(parts.FREQ ?? "").toLowerCase(),
    interval,
    ...(parts.COUNT ? { count: +parts.COUNT } : {}),
    ...(until ? { until } : {}),
    ...(parts.BYDAY ? { byDay: parts.BYDAY.split(",") } : {}),
    text: words,
  };
}

/** A DURATION (-PT15M, P1D…) in minutes, or null. */
export function durationMinutes(value) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const minutes = (+(m[2] ?? 0)) * 10080 + (+(m[3] ?? 0)) * 1440 + (+(m[4] ?? 0)) * 60 + (+(m[5] ?? 0)) + (+(m[6] ?? 0)) / 60;
  return m[1] === "-" ? -minutes : minutes;
}

function readEvent(component, calendarIndex) {
  const start = readWhen(prop(component, "DTSTART"))?.[0];
  const end = readWhen(prop(component, "DTEND"))?.[0];
  const allDay = Boolean(start?.date);
  const event = { calendar: calendarIndex, uid: text(component, "UID"), title: text(component, "SUMMARY") };
  if (start) {
    event.start = start.value;
    if (start.timeZone) event.timeZone = start.timeZone;
    if (start.floating) event.floating = true;
  }
  event.allDay = allDay;
  if (end) {
    event.end = end.value;
    if (allDay && end.date) {
      const [y, m, d] = end.value.split("-").map(Number);
      const last = new Date(Date.UTC(y, m - 1, d - 1));
      event.lastDay = last.toISOString().slice(0, 10);
    }
  }
  const duration = prop(component, "DURATION");
  if (duration) event.duration = duration.value;
  for (const [key, name] of [["description", "DESCRIPTION"], ["location", "LOCATION"], ["status", "STATUS"]]) {
    const value = text(component, name);
    if (value !== undefined) event[key] = value;
  }
  const url = prop(component, "URL");
  if (url) event.url = url.value;
  const rules = props(component, "RRULE");
  if (rules.length) event.repeat = rules.length === 1 ? describeRule(rules[0].value) : rules.map((r) => describeRule(r.value));
  const rdates = props(component, "RDATE").flatMap((p) => readWhen(p).map((w) => w.value));
  if (rdates.length) event.alsoOn = rdates;
  const exdates = props(component, "EXDATE").flatMap((p) => readWhen(p).map((w) => w.value));
  if (exdates.length) event.except = exdates;
  const recurrenceId = prop(component, "RECURRENCE-ID");
  if (recurrenceId) event.replacesOccurrence = readWhen(recurrenceId)[0].value;
  const alarms = component.children.filter((child) => child.name === "VALARM").map((alarm) => {
    const triggerProp = prop(alarm, "TRIGGER");
    const reminder = { action: prop(alarm, "ACTION")?.value, trigger: triggerProp?.value };
    if (triggerProp && triggerProp.params.VALUE !== "DATE-TIME") {
      const minutes = durationMinutes(triggerProp.value);
      if (minutes !== null && minutes <= 0) reminder.minutesBefore = -minutes;
      if (triggerProp.params.RELATED === "END") reminder.relatedTo = "end";
    }
    const description = text(alarm, "DESCRIPTION");
    if (description !== undefined) reminder.description = description;
    return reminder;
  });
  if (alarms.length) event.reminders = alarms;
  const problems = [];
  if (!event.uid) problems.push("no UID");
  if (!start) problems.push("no DTSTART");
  else if (start.unreadable) problems.push(`DTSTART ${start.value} isn't a date or time`);
  if (event.title === undefined) problems.push("no SUMMARY (title)");
  if (end && start && end.date !== start.date) problems.push("DTSTART and DTEND aren't the same kind (date and time)");
  if (end && start && !end.unreadable && !start.unreadable && end.value.replace(/Z$/, "") < start.value.replace(/Z$/, "")) problems.push("DTEND is before DTSTART");
  if (problems.length) event.problems = problems;
  return event;
}

/**
 * A file's calendars and a page of its events: { calendars, total, offset, events, nextOffset, problems }.
 */
export function readCalendar(source, { offset = 0, limit = 50 } = {}) {
  const { root, problems } = parseTree(source);
  const calendars = root.children.filter((c) => c.name === "VCALENDAR");
  if (!calendars.length) problems.unshift("no BEGIN:VCALENDAR: this isn't an iCalendar file");
  const events = [];
  const summaries = calendars.map((calendar, index) => {
    const zones = calendar.children.filter((c) => c.name === "VTIMEZONE").map((zone) => text(zone, "TZID"));
    const counts = {};
    for (const child of calendar.children) counts[child.name] = (counts[child.name] ?? 0) + 1;
    for (const child of calendar.children.filter((c) => c.name === "VEVENT")) events.push(readEvent(child, index));
    const summary = { version: text(calendar, "VERSION"), prodid: text(calendar, "PRODID") };
    for (const [key, name] of [["method", "METHOD"], ["name", "X-WR-CALNAME"], ["description", "X-WR-CALDESC"], ["timeZone", "X-WR-TIMEZONE"]]) {
      const value = text(calendar, name);
      if (value !== undefined) summary[key] = value;
    }
    summary.timeZones = zones;
    summary.events = counts.VEVENT ?? 0;
    const others = Object.entries(counts).filter(([name]) => name !== "VEVENT" && name !== "VTIMEZONE");
    if (others.length) summary.otherComponents = Object.fromEntries(others);
    if (summary.version !== "2.0") problems.push(`calendar ${index + 1}: VERSION is ${summary.version ?? "missing"}, not 2.0`);
    if (!summary.prodid) problems.push(`calendar ${index + 1}: no PRODID`);
    for (const event of events.filter((e) => e.calendar === index && e.timeZone && e.timeZone !== "UTC" && !zones.includes(e.timeZone))) {
      problems.push(`event "${event.title}" uses time zone ${event.timeZone}, which the file doesn't define (apps that know the name still read it)`);
      break;
    }
    return summary;
  });
  const page = events.slice(offset, offset + limit);
  return {
    calendars: summaries,
    total: events.length,
    offset,
    events: page,
    nextOffset: offset + page.length < events.length ? offset + page.length : null,
    ...(problems.length ? { problems } : {}),
  };
}
