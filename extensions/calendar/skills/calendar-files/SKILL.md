---
name: calendar-files
description: Write events as an iCalendar (.ics) file with the calendar server - timed events in the person's time zone, all-day events, repetitions with exceptions, reminders - that Google Calendar, Outlook or Apple Calendar import; read an .ics back to check it or to show what one holds; and tell the person how to import it. Use when the person asks to put dates, deadlines, sessions or a plan into their calendar, for an .ics or iCalendar file, or to look inside one.
---

# Calendar files

The calendar server writes `.ics` files (iCalendar, RFC 5545) on this computer and reads them back. It doesn't touch any calendar app: the person imports the file. It knows the file format, not what the dates are: the events come from the person or from what you worked out with them, and you never invent dates, holidays or school calendars.

## Before writing

- **The events first, in a list the person can check**: title, day, time or all day, how it repeats, reminders. For more than a handful, show the list and get their yes before writing.
- **The time zone is the person's**, as an IANA name (`Europe/Madrid`, `America/Mexico_City`, `Atlantic/Canary`), never an offset like +01:00: an offset is wrong half the year where clocks change. Take it from what they've said or where they are; if you don't know it, ask. Pass it as the file's `timeZone`; give an event its own `timeZone` only when it really happens elsewhere (a call with someone abroad keeps the person's zone if they gave the time in their own). Use `UTC` only when they gave the times in UTC.
- **Times are wall-clock times** in that zone, as the person would read them on their clock (`2026-11-20T09:00`), with no offset or Z: the server adds the zone's rules, summer time included.

## All-day or timed

- **All-day** (`start` is a date, `2026-12-01`): a day or several that have no time, such as a deadline day, an exam week or a trip. `end` is its last day, included (`2026-12-04` for 1 to 4 December): the server writes the day after, as the format asks. Don't add a day yourself.
- **Timed** (`start` with a time): anything at an hour. Give an `end` (a full time, or `HH:MM` on the same day) for what takes time, such as a class, a session or a meeting. A deadline at an hour (submit by 23:59) can be a point in time, with no `end`.

## Repetitions or separate events

- **One repeating event** (`repeat`) when it happens on a regular pattern: every week on Monday and Wednesday, every two weeks, the first Thursday of the month. Give `frequency` (`daily`, `weekly`, `monthly`, `yearly`), `interval` when it's every 2 or more, `byDay` for the days (`MO`…`SU`; `1TH` the first Thursday, `-1FR` the last Friday, monthly only), and an end: `count` (how many times in all) or `until` (its last possible day, included), never both. `start` must be the first real occurrence, on one of the `byDay` days: the server refuses it otherwise.
- **Days off** in a repetition go in `except`, as dates: the server puts each at the event's start time. Use it for the dates the person gives you (a holiday, a week off); never assume them.
- **Separate events** when the dates have no pattern, when each occurrence has its own title or notes (session 1, session 2…), or when they'd need more than a few exceptions.

## Reminders

`reminders` are minutes before the start: `15`, `60`, `1440` (a day before), `10080` (a week before). Ask what the person wants, or offer one or two sensible ones for what matters (a deadline: a day and a week before); don't put reminders on everything. For an all-day event they count from midnight of its first day, so `1440` rings at midnight the day before: say so, or prefer a timed event when the hour of the reminder matters. Some apps replace a file's reminders with the calendar's own default notifications on import (Google Calendar may): say so if reminders matter.

## Writing it

- **Where**: an absolute path ending in `.ics`, in a folder that exists; the person's Downloads or Documents folder unless they say otherwise. Name it after what it holds (`essay-deadlines-2026.ics`), and give `calendarName` the same idea.
- **`write_ics`** checks everything first. When something is wrong nothing is written, and the reply lists every problem: fix exactly those and call again. It warns about times the clocks skip (the hour lost when summer time starts) and repetitions with no end: tell the person.
- **An existing file is never replaced** unless you pass `overwrite: true`, and you only do that with the person's yes; otherwise choose another name.
- **The uids** come back in the reply. Fill `description` with what the person needs on the day, `location` with the room or address, `url` with a link (an assignment's page, a video call).

## Checking it

Offer to read the file back with `read_ics`: it gives each event's title, start, end (`lastDay` for all-day ones), zone, repetition in words ("every week on Monday and Wednesday, until …"), exceptions and reminders, so you can show the person a short list and confirm it's what they meant. It also reads any `.ics` they have, a page at a time (`offset`, `limit`, `nextOffset`), and lists the problems it finds.

## Changing a file already imported

Write the new file with the same events' `uid` values (from the earlier reply or from `read_ics`). Some apps update events that keep their uid, others add copies; the surest way is to import the file into a calendar of its own, so the person can delete that calendar and import the new file instead.

## Importing it

Tell the person where the file is, and how to bring it into their app:

- **Google Calendar**: on a computer (the phone app can't import), Settings, then "Import & export", choose the file and the calendar to add it to, then Import. Creating a new calendar for it first keeps it apart and easy to remove.
- **Outlook**: in the new Outlook or Outlook on the web, Calendar, "Add calendar", "Upload from file", then choose the file and the calendar. In classic Outlook for Windows, File, "Open & Export", "Import/Export", "Import an iCalendar (.ics) or vCalendar file".
- **Apple Calendar**: on a Mac, File, Import (or double-click the file) and choose the calendar. On an iPhone or iPad, open the file from Mail or Files and tap "Add All".

`server_info` gives the server's version and limits.
