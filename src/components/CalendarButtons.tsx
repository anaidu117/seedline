import { buildIcs, googleCalendarUrl, type DeadlineEvent } from '../../shared/ics.ts';
import type { Opportunity, Window } from '../../shared/matching/index.ts';
import { SITE_URL } from '../lib/supabase.ts';

export function deadlineEvent(o: Pick<Opportunity, 'slug' | 'name' | 'organizer'>, date: string): DeadlineEvent {
  return {
    uid: `${o.slug}-${date}`,
    title: `Deadline: ${o.name}`,
    date,
    description: `${o.organizer}. Confirm the deadline with the organizer.`,
    url: `${SITE_URL}/opportunity/${o.slug}`,
  };
}

/** "Add to Google Calendar" and ".ics" download for one deadline (spec 7.2). */
export function CalendarButtons({ o, window }: { o: Opportunity; window: Window }) {
  if (!window.closes) return null;
  const ev = deadlineEvent(o, window.closes);
  const download = () => {
    const blob = new Blob([buildIcs([ev])], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${o.slug}-deadline.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn btn-quiet" href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer noopener">Add to Google Calendar</a>
      <button type="button" className="btn btn-quiet" onClick={download}>Download .ics</button>
    </div>
  );
}
