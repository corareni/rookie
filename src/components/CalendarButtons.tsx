"use client";

import { downloadIcs, googleCalendarUrl, type CalEvent } from "@/lib/calendar";

/** "Google Calendar" opens a pre-filled event; "Apple Calendar" downloads an .ics file (also works in Outlook). */
export default function CalendarButtons({ event, small = false }: { event: CalEvent; small?: boolean }) {
  const size = small ? "!min-h-[32px] !px-3 !text-[12.5px]" : "";
  return (
    <span className="flex flex-wrap gap-1.5">
      <a className={`act gap-1.5 !bg-[var(--sky)] ${size}`} href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
        <span aria-hidden="true">＋</span> Google Calendar
      </a>
      <button type="button" className={`act gap-1.5 !bg-[var(--lilac)] ${size}`} onClick={() => downloadIcs(event, event.title)}>
        <span aria-hidden="true">＋</span> Apple Calendar
      </button>
    </span>
  );
}
