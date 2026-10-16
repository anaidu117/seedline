// iCalendar (.ics) text and Google Calendar links for deadlines. All-day events on the deadline date.
import type { IsoDate } from './dates.ts';
import { addDays } from './dates.ts';

export interface DeadlineEvent {
  uid: string;
  title: string;
  date: IsoDate;
  description?: string;
  url?: string;
}

/** Escapes text per RFC 5545 section 3.3.11. */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets (RFC 5545 section 3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

const compact = (d: IsoDate) => d.replace(/-/g, '');

export function buildIcs(events: DeadlineEvent[], opts: { name?: string; now?: Date } = {}): string {
  const stamp = (opts.now ?? new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Seedline//Deadlines//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...(opts.name ? [`X-WR-CALNAME:${icsEscape(opts.name)}`] : []),
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@seedline`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${icsEscape(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(e: DeadlineEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${compact(e.date)}/${compact(addDays(e.date, 1))}`,
    details: [e.description, e.url].filter(Boolean).join('\n'),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
