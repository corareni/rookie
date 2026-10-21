"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CalendarButtons from "@/components/CalendarButtons";
import { titleCase } from "@/lib/applications";
import { eventLabel, type CalEvent } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";

export type EventFields = {
  event_at: string | null;
  event_minutes: number;
  event_location: string | null;
  event_kind: "interview" | "assessment" | "other" | null;
  /** What an "Other" event is, e.g. "Coffee chat with the recruiter". */
  event_note?: string | null;
};

/** The event's name: the user's own words for "Other", else Interview or Assessment. */
export const eventName = (kind: EventFields["event_kind"] | undefined, note?: string | null) =>
  kind === "assessment" ? "Assessment" : kind === "other" ? note?.trim() || "Next step" : "Interview";

const KINDS = [
  { v: "interview", label: "Interview" },
  { v: "assessment", label: "Assessment or test" },
  { v: "other", label: "Other (you name it)" },
] as const;

/** `datetime-local` wants local time without a zone: "2026-10-24T10:00". */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function buildEvent(
  app: { id: string; company: string | null; role: string | null; title: string; job_url: string | null; next_step?: string | null },
  ev: EventFields,
): CalEvent | null {
  if (!ev.event_at) return null;
  const kind = eventName(ev.event_kind, ev.event_note);
  const who = [app.company ?? app.title, app.role ? titleCase(app.role) : null].filter(Boolean).join(" · ");
  return {
    uid: `${app.id}-${ev.event_kind ?? "event"}`,
    title: `${kind}: ${who}`,
    start: new Date(ev.event_at),
    minutes: ev.event_minutes || 60,
    location: ev.event_location,
    details: [app.next_step ? `Next step: ${app.next_step}` : "", app.job_url ? `Job ad: ${app.job_url}` : "", "Added from Rookie"]
      .filter(Boolean)
      .join("\n"),
  };
}

/** Date, time and place of the interview or assessment, with one-click calendar entries. */
export default function EventPanel({
  app,
  initial,
  ready,
}: {
  app: { id: string; company: string | null; role: string | null; title: string; job_url: string | null; status: string; next_step: string | null };
  initial: EventFields;
  ready: boolean;
}) {
  const router = useRouter();
  const [ev, setEv] = useState<EventFields>({
    ...initial,
    event_kind: initial.event_kind ?? (app.status === "assessment" ? "assessment" : app.status === "interview" ? "interview" : "other"),
  });
  const [local, setLocal] = useState(toLocalInput(initial.event_at));
  const [saved, setSaved] = useState<EventFields>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const next = { ...ev, event_at: local ? new Date(local).toISOString() : null };
    if (next.event_kind === "other" && next.event_at && !next.event_note?.trim()) return setMsg("Say what it is first, e.g. Coffee chat with the recruiter.");
    // The note only exists for "Other" (and its column needs the latest database update).
    const { event_note, ...fields } = next;
    const row = next.event_kind === "other" ? { ...fields, event_note: event_note?.trim().slice(0, 120) || null } : fields;
    setBusy(true);
    const { error } = await createClient().from("applications").update(row).eq("id", app.id);
    setBusy(false);
    if (error)
      return setMsg(
        /event_note/.test(error.message)
          ? "Naming an Other event needs the latest database update. Choose Interview or Assessment for now."
          : `Couldn't save: ${error.message}`,
      );
    setEv(next);
    setSaved(next);
    setMsg(next.event_at ? "Saved. Add it to your calendar below." : "Date removed.");
    router.refresh();
  }

  const event = buildEvent(app, saved);
  const dirty = (local ? new Date(local).toISOString() : null) !== saved.event_at || ev.event_minutes !== saved.event_minutes ||
    (ev.event_location ?? "") !== (saved.event_location ?? "") || ev.event_kind !== saved.event_kind ||
    (ev.event_kind === "other" && (ev.event_note ?? "") !== (saved.event_note ?? ""));

  return (
    <section id="calendar" className="mt-8 scroll-mt-20" aria-labelledby="cal-h">
      <h2 id="cal-h" className="sec">
        <small>[ ]</small> Date and time <span className="font-light text-[var(--mute)]">· for your calendar</span>
      </h2>
      <div className="tile tile-sky mt-3 grid gap-4">
        {!ready ? (
          <p className="text-[14px] text-[var(--ink2)]">Calendar dates switch on with the next database update.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="ev-kind" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                  What is it?
                </label>
                <select
                  id="ev-kind"
                  className="field !py-2 !text-[14px]"
                  value={ev.event_kind ?? "interview"}
                  onChange={(e) => setEv({ ...ev, event_kind: e.target.value as EventFields["event_kind"] })}
                >
                  {KINDS.map((k) => (
                    <option key={k.v} value={k.v}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ev-at" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                  Date and time
                </label>
                <input id="ev-at" type="datetime-local" className="field !py-2 !text-[14px]" value={local} onChange={(e) => setLocal(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ev-min" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                  How long
                </label>
                <select
                  id="ev-min"
                  className="field !py-2 !text-[14px]"
                  value={ev.event_minutes}
                  onChange={(e) => setEv({ ...ev, event_minutes: Number(e.target.value) })}
                >
                  {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                    <option key={m} value={m}>
                      {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ev-loc" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                  Where (address or video link)
                </label>
                <input
                  id="ev-loc"
                  className="field !py-2 !text-[14px]"
                  placeholder="e.g. Google Meet link"
                  value={ev.event_location ?? ""}
                  onChange={(e) => setEv({ ...ev, event_location: e.target.value })}
                />
              </div>
            </div>
            {ev.event_kind === "other" && (
              <div className="max-w-[520px]">
                <label htmlFor="ev-note" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                  What is it?
                </label>
                <input
                  id="ev-note"
                  className="field !py-2 !text-[14px]"
                  maxLength={120}
                  placeholder="e.g. Coffee chat with the recruiter"
                  value={ev.event_note ?? ""}
                  onChange={(e) => setEv({ ...ev, event_note: e.target.value })}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn !py-2" disabled={busy || !dirty} onClick={save}>
                {busy ? "Saving…" : "Save date"}
              </button>
              {event && !dirty && <CalendarButtons event={event} />}
              {event && !dirty && <span className="text-[13px] text-[var(--ink2)]">{eventLabel(saved.event_at!)}</span>}
              {msg && (
                <span role="status" className="text-[13px] text-[var(--ink2)]">
                  {msg}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
