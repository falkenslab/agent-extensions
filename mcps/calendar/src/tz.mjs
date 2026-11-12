// Time zones from the platform's own data (Intl, ICU's copy of the IANA database): checking a zone's name,
// turning a wall-clock time in a zone into an instant, and writing a VTIMEZONE for the years a file covers.

const UTC_NAMES = new Set(["utc", "etc/utc", "etc/uct", "uct", "gmt", "etc/gmt", "etc/gmt0", "etc/gmt+0", "etc/gmt-0", "etc/universal", "universal", "etc/zulu", "zulu", "etc/greenwich", "greenwich"]);
const formatters = new Map();

/** Whether a zone's name means UTC: its times are then written with a Z and no VTIMEZONE. */
export const isUtc = (zone) => UTC_NAMES.has(zone.toLowerCase());

function formatter(zone) {
  let format = formatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
    formatters.set(zone, format);
  }
  return format;
}

/** The problem with a zone's name, or null when it's an IANA zone this computer knows. */
export function zoneProblem(zone) {
  if (typeof zone !== "string" || !/^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+){0,2}$/.test(zone)) return `"${zone}" isn't an IANA time zone name (like Europe/Madrid, America/Mexico_City or UTC)`;
  try {
    formatter(zone);
    return null;
  } catch {
    return `"${zone}" isn't a time zone this computer knows: use an IANA name like Europe/Madrid, America/Mexico_City or UTC`;
  }
}

/** The wall-clock time in a zone at an instant (whole seconds), as numbers. */
export function wallAt(zone, ms) {
  const parts = {};
  for (const part of formatter(zone).formatToParts(new Date(ms))) parts[part.type] = part.value;
  return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute, s: +parts.second };
}

/** A zone's offset from UTC at an instant, in minutes. */
export function offsetAt(zone, ms) {
  const whole = Math.floor(ms / 1000) * 1000;
  const w = wallAt(zone, whole);
  return Math.round((Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - whole) / 60000);
}

/**
 * The instant a wall-clock time in a zone stands for. `exists` is false when the clocks skip that time
 * (the hour lost when daylight saving starts): the instant is then the one an hour later, as calendar apps do.
 */
export function wallToUtc(zone, w) {
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s ?? 0);
  if (isUtc(zone)) return { ms: asUtc, exists: true };
  const before = asUtc - offsetAt(zone, asUtc - 86400000) * 60000;
  const after = asUtc - offsetAt(zone, asUtc + 86400000) * 60000;
  const same = (ms) => { const b = wallAt(zone, ms); return b.y === w.y && b.m === w.m && b.d === w.d && b.h === w.h && b.mi === w.mi && b.s === (w.s ?? 0); };
  // Repeated (clocks go back): the first of the two, as RFC 5545 says. Skipped: read with the offset before.
  for (const ms of [before, after].sort((x, y) => x - y)) if (same(ms)) return { ms, exists: true };
  return { ms: before, exists: false };
}

/** Every change of a zone's offset between two instants: when (ms, UTC), and the offsets before and after. */
export function transitions(zone, fromMs, toMs) {
  const found = [];
  const step = 6 * 3600 * 1000;
  let previous = offsetAt(zone, fromMs);
  for (let t = fromMs + step; t <= toMs + step; t += step) {
    const now = offsetAt(zone, t);
    if (now === previous) continue;
    let lo = t - step; // offset `previous`
    let hi = t; // offset `now` (or another change in between, rare enough to ignore)
    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2000) * 1000;
      if (mid <= lo) break;
      if (offsetAt(zone, mid) === previous) lo = mid;
      else hi = mid;
    }
    found.push({ ms: hi, from: previous, to: now });
    previous = now;
  }
  return found;
}

const pad = (n, size = 2) => String(n).padStart(size, "0");
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** An offset in minutes as iCalendar's UTC-OFFSET, like +0100 or -0330. */
export function utcOffset(minutes) {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

const localStamp = (w) => `${pad(w.y, 4)}${pad(w.m)}${pad(w.d)}T${pad(w.h)}${pad(w.mi)}${pad(w.s)}`;

/** The wall-clock time a transition starts at, in the offset before it (as VTIMEZONE's DTSTART is). */
function onset(transition) {
  const date = new Date(transition.ms + transition.from * 60000);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate(), h: date.getUTCHours(), mi: date.getUTCMinutes(), s: date.getUTCSeconds(), weekday: date.getUTCDay() };
}

/** The yearly rules a transition's day fits: the nth or last weekday of its month, or its day of the month. */
function rulesFor(w) {
  const daysInMonth = new Date(Date.UTC(w.y, w.m, 0)).getUTCDate();
  const nth = Math.ceil(w.d / 7);
  const rules = [];
  if (nth <= 4) rules.push(`FREQ=YEARLY;BYMONTH=${w.m};BYDAY=${nth}${DAYS[w.weekday]}`);
  if (w.d + 7 > daysInMonth) rules.push(`FREQ=YEARLY;BYMONTH=${w.m};BYDAY=-1${DAYS[w.weekday]}`);
  rules.push(`FREQ=YEARLY;BYMONTH=${w.m};BYMONTHDAY=${w.d}`);
  const time = `${pad(w.h)}${pad(w.mi)}${pad(w.s)}`;
  return rules.map((rule) => `${rule}|${time}`);
}

/** The zone's abbreviation at an instant when it has a real one (CET, EST), not a GMT+1 made up for it. */
function abbreviation(zone, ms) {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value;
    return name && /^[A-Z]{2,6}$/.test(name) ? name : null;
  } catch {
    return null;
  }
}

function observance(zone, transition, rule) {
  const kind = transition.to > transition.from ? "DAYLIGHT" : "STANDARD";
  const lines = [`BEGIN:${kind}`, `DTSTART:${localStamp(onset(transition))}`];
  if (rule) lines.push(`RRULE:${rule}`);
  lines.push(`TZOFFSETFROM:${utcOffset(transition.from)}`, `TZOFFSETTO:${utcOffset(transition.to)}`);
  const name = abbreviation(zone, transition.ms + 1000);
  if (name) lines.push(`TZNAME:${name}`);
  lines.push(`END:${kind}`);
  return lines;
}

/**
 * A VTIMEZONE for a zone, right for the years from `fromYear` to `toYear`: when its changes follow one
 * yearly rule each (the last Sunday of March, the second Sunday of March…), one observance per kind with
 * that rule, which stays right after those years too; otherwise one observance per change. A zone with
 * no changes in those years gets one STANDARD with its offset.
 */
export function vtimezone(zone, fromYear, toYear) {
  const start = Date.UTC(fromYear, 0, 1);
  const end = Date.UTC(toYear + 1, 0, 1);
  const changes = transitions(zone, start, end);
  const lines = ["BEGIN:VTIMEZONE", `TZID:${zone}`];
  if (!changes.length) {
    const offset = offsetAt(zone, start);
    lines.push("BEGIN:STANDARD", "DTSTART:19700101T000000", `TZOFFSETFROM:${utcOffset(offset)}`, `TZOFFSETTO:${utcOffset(offset)}`);
    const name = abbreviation(zone, start);
    if (name) lines.push(`TZNAME:${name}`);
    lines.push("END:STANDARD", "END:VTIMEZONE");
    return lines;
  }
  const groups = new Map();
  for (const change of changes) {
    const key = `${change.from}>${change.to}`;
    groups.set(key, [...(groups.get(key) ?? []), change]);
  }
  const fitted = [];
  const yearly = groups.size === 2 && [...groups.values()].every((group) => {
    const years = group.map((change) => onset(change).y);
    if (group.length < 2 || new Set(years).size !== group.length) return false;
    for (let i = 1; i < years.length; i++) if (years[i] !== years[i - 1] + 1) return false;
    let common = rulesFor(onset(group[0]));
    for (const change of group.slice(1)) {
      const these = new Set(rulesFor(onset(change)));
      common = common.filter((rule) => these.has(rule));
    }
    if (!common.length) return false;
    fitted.push([group[0], common[0].split("|")[0]]);
    return true;
  });
  // Before the first change, the offset it changes from: so every time in those years is defined.
  const first = changes[0];
  const firstKind = first.from > first.to ? "DAYLIGHT" : "STANDARD";
  lines.push(`BEGIN:${firstKind}`, "DTSTART:19700101T000000", `TZOFFSETFROM:${utcOffset(first.from)}`, `TZOFFSETTO:${utcOffset(first.from)}`);
  const firstName = abbreviation(zone, first.ms - 1000);
  if (firstName) lines.push(`TZNAME:${firstName}`);
  lines.push(`END:${firstKind}`);
  if (yearly) for (const [change, rule] of fitted) lines.push(...observance(zone, change, rule));
  else for (const change of changes) lines.push(...observance(zone, change, null));
  lines.push("END:VTIMEZONE");
  return lines;
}
