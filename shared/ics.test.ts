import { describe, expect, it } from 'vitest';
import { buildIcs, googleCalendarUrl, icsEscape } from './ics.ts';

describe('ics', () => {
  const ev = { uid: 'example-x', title: 'Deadline: EXAMPLE, grant; round 1', date: '2026-11-20', description: 'Line one\nLine two', url: 'https://example.com/x' };

  it('builds a valid all-day event', () => {
    const ics = buildIcs([ev], { now: new Date('2026-10-15T12:00:00Z'), name: 'Seedline deadlines' });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20261121\r\n');
    expect(ics).toContain('DTSTAMP:20261015T120000Z\r\n');
    expect(ics).toContain('SUMMARY:Deadline: EXAMPLE\\, grant\; round 1\r\n');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\r\n');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('folds long lines to 75 octets', () => {
    const ics = buildIcs([{ ...ev, description: 'x'.repeat(200) }]);
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('escapes special characters', () => {
    expect(icsEscape('a\\b;c,d\ne')).toBe('a\\\\b\;c\\,d\\ne');
  });

  it('builds a Google Calendar link for the deadline day', () => {
    const u = new URL(googleCalendarUrl(ev));
    expect(u.hostname).toBe('calendar.google.com');
    expect(u.searchParams.get('dates')).toBe('20261120/20261121');
    expect(u.searchParams.get('text')).toBe(ev.title);
  });
});
