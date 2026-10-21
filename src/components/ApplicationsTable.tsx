"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STATUSES, daysUntil, deadlineText, formatDate, titleCase, type Application, type Status } from "@/lib/applications";
import CalendarButtons from "@/components/CalendarButtons";
import { buildEvent, eventName, type EventFields } from "@/components/EventPanel";
import { eventLabel } from "@/lib/calendar";
import Dialog from "@/components/Dialog";
import EmailUpdate from "@/components/EmailUpdate";
import { useTasks } from "@/components/Tasks";
import StatusConfirm, { NO_EVENT, clearedDates, type StatusChange } from "@/components/StatusConfirm";
import { createClient } from "@/lib/supabase/client";

const GROUPS: { title: string; statuses: Status[]; tone: string }[] = [
  { title: "Interviews and assessments", statuses: ["interview", "assessment"], tone: "bg-[var(--warnbg)] text-[var(--warn)]" },
  { title: "Offers", statuses: ["offer"], tone: "bg-[var(--goodbg)] text-[var(--good)]" },
  { title: "Submitted, waiting to hear back", statuses: ["submitted"], tone: "bg-[var(--card2)] text-[var(--ink)]" },
  { title: "Rejected or withdrawn", statuses: ["rejected", "withdrawn"], tone: "bg-[var(--badbg)] text-[var(--bad)]" },
];

const GMAIL_NOTE: Record<string, string> = {
  cancelled: "Gmail wasn't connected: the Google window was closed or access was declined.",
  noscope: "Gmail wasn't connected: please tick the box that lets Rookie read your emails.",
  failed: "Gmail couldn't be connected. Please try again.",
  unavailable: "Email checks aren't switched on here yet. Paste an email instead.",
};

export default function ApplicationsTable({
  initial,
  events: initialEvents = {},
  gmail = null,
}: {
  initial: Application[];
  events?: Record<string, EventFields>;
  /** Result of connecting Gmail, from the address Google sends the user back to. */
  gmail?: string | null;
}) {
  const { checkEmails, checking } = useTasks();
  const checked = useRef(false);
  const [gmailNote, setGmailNote] = useState(gmail && GMAIL_NOTE[gmail] ? GMAIL_NOTE[gmail] : null);

  // Just connected: check straight away, then tidy the address.
  useEffect(() => {
    if (!gmail || checked.current) return;
    checked.current = true;
    if (gmail === "connected") checkEmails();
    window.history.replaceState(null, "", "/app/applications");
  }, [gmail, checkEmails]);

  const [items, setItems] = useState(initial);
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<(StatusChange & { id: string }) | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  /** Mirror an update applied from an email in the table. */
  function applied(id: string, patch: Record<string, unknown>) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    if ("event_at" in patch) {
      setEvents((prev) => {
        const { [id]: old, ...rest } = prev;
        if (!patch.event_at) return rest;
        return { ...rest, [id]: { ...(old ?? { event_minutes: 60, event_location: null, event_kind: null }), ...patch } as EventFields };
      });
    }
  }

  async function save(id: string, p: Partial<Application>) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)));
    const { error } = await createClient().from("applications").update(p).eq("id", id);
    if (error) setError(`Couldn't save: ${error.message}`);
  }

  async function changeStatus(removeEvent: boolean) {
    if (!pending) return;
    const { id, to } = pending;
    const dates = clearedDates(to, pending.dates);
    setPending(null);
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: to, ...dates } : a)));
    if (removeEvent)
      setEvents((prev) => {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      });
    const { error } = await createClient()
      .from("applications")
      .update({ status: to, ...dates, ...(removeEvent ? NO_EVENT : {}) })
      .eq("id", id);
    if (error) setError(`Couldn't save: ${error.message}`);
  }

  return (
    <main className="pb-16">
      <section className="hero">
        <span className="cap">Sent</span>
        <h1 className="display mt-3">
          Applied <em>{items.filter((a) => a.status !== "withdrawn").length}.</em>
        </h1>
        <p className="mt-4 max-w-[560px] text-[16px] text-[var(--ink2)]">
          Everything you&apos;ve applied to, where it stands and what&apos;s next. Mark a role as applied on the Board and it
          shows up here.
        </p>
        {items.length > 0 && (
          <span className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn !py-2.5" disabled={checking} onClick={checkEmails}>
              {checking ? "Checking your emails…" : "Check emails"}
            </button>
            <button type="button" className="btn btn-ghost !py-2.5" onClick={() => setEmailOpen(true)}>
              Paste an email
            </button>
          </span>
        )}
        {gmailNote && (
          <p role="status" className="mt-3 text-[14px] text-[var(--ink2)]">
            {gmailNote}{" "}
            <button type="button" className="font-bold underline" onClick={() => setGmailNote(null)}>
              OK
            </button>
          </p>
        )}
        <div className="kpis mt-6">
          {(["submitted", "interview", "offer", "rejected"] as Status[]).map((s) => (
            <div key={s} className="kpi">
              <b>
                {s === "interview"
                  ? items.filter((a) => a.status === "interview" || a.status === "assessment").length
                  : items.filter((a) => a.status === s).length}
              </b>
              <span>{s === "interview" ? "Interview or test" : STATUSES.find((x) => x.value === s)?.label}</span>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="alert mt-4">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="card mt-6 text-center">
          <p className="text-lg font-semibold">Nothing applied yet.</p>
          <p className="mt-1 text-[var(--ink2)]">
            On the <Link href="/app">Board</Link>, press &quot;Mark as applied&quot; on a role and it moves here.
          </p>
        </div>
      ) : (
        <div className="card mt-6 !p-0 overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_90px_160px_1.3fr] gap-4 px-6 pt-5 pb-2 md:grid">
            {["Company", "Applied", "Status", "Next"].map((h) => (
              <span key={h} className="cap">
                {h}
              </span>
            ))}
          </div>
          {GROUPS.map((g) => {
            const rows = items.filter((a) => g.statuses.includes(a.status));
            if (rows.length === 0) return null;
            return (
              <section key={g.title} className="px-3 pb-3 md:px-4">
                <h2 className={`mt-3 flex justify-between rounded-2xl px-4 py-2.5 text-[14px] font-semibold ${g.tone}`}>
                  <span>● {g.title}</span>
                  <span>{rows.length}</span>
                </h2>
                {rows.map((a) => (
                  <Row
                    key={a.id}
                    a={a}
                    ev={events[a.id]}
                    onSave={(p) => save(a.id, p)}
                    onStatus={(to) =>
                      setPending({
                        id: a.id,
                        name: a.company ?? a.title,
                        from: a.status,
                        to,
                        eventAt: events[a.id]?.event_at ?? null,
                        eventKind: events[a.id]?.event_kind ?? null,
                        dates: a,
                      })
                    }
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}
      <StatusConfirm change={pending} onCancel={() => setPending(null)} onConfirm={changeStatus} />
      <Dialog
        open={emailOpen}
        title="Got an email from a company?"
        onCancel={() => setEmailOpen(false)}
        actions={[{ label: "Close", tone: "ghost", onClick: () => setEmailOpen(false) }]}
      >
        <p className="mb-3">Paste it and Rookie suggests the new status, interview date and next step.</p>
        {emailOpen && (
          <EmailUpdate
            roles={items.map((a) => ({ ...a, event_at: events[a.id]?.event_at ?? null, event_kind: events[a.id]?.event_kind ?? null }))}
            onApplied={applied}
          />
        )}
      </Dialog>
    </main>
  );
}

function Row({
  a,
  ev,
  onSave,
  onStatus,
}: {
  a: Application;
  ev?: EventFields;
  onSave: (p: Partial<Application>) => void;
  onStatus: (s: Status) => void;
}) {
  const [next, setNext] = useState(a.next_step ?? "");
  const days = a.deadline ? daysUntil(a.deadline) : null;
  return (
    <div className="grid gap-3 border-b border-[var(--line)] px-3 py-4 last:border-0 md:grid-cols-[1.6fr_90px_160px_1.3fr] md:items-center md:gap-4">
      <div className="min-w-0">
        <Link href={`/app/a/${a.id}`} className="text-[16px] font-bold no-underline hover:underline">
          {a.company ?? a.title}
        </Link>
        {a.company && <p className="text-[15px] font-light text-[var(--ink)]">{titleCase(a.role ?? a.title)}</p>}
        {(a.status === "interview" || a.status === "assessment") && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Link href={`/app/a/${a.id}#interview`} className="act !min-h-[32px] !text-[12.5px]">
              Practise questions
            </Link>
            {!ev?.event_at && (
              <Link href={`/app/a/${a.id}#calendar`} className="act !min-h-[32px] !text-[12.5px] !bg-[var(--sky)]">
                Set date and time
              </Link>
            )}
          </span>
        )}
        {ev?.event_at && (
          <span className="mt-2 grid gap-1.5">
            <span className="text-[13px] font-bold">
              {eventName(ev.event_kind, ev.event_note)} ·{" "}
              {eventLabel(ev.event_at)}
            </span>
            <CalendarButtons event={buildEvent(a, ev)!} small />
          </span>
        )}
        {a.deadline && days !== null && days >= -1 && (
          <p className={`mt-1 text-[13px] font-semibold ${days <= 3 ? "text-[var(--warn)]" : "text-[var(--good)]"}`}>
            {deadlineText(a.deadline)}
          </p>
        )}
      </div>
      <span className="text-[14px] text-[var(--ink2)]">
        <span className="md:hidden">Applied </span>
        {a.submitted_on ? formatDate(a.submitted_on) : "–"}
      </span>
      <label>
        <span className="sr-only">Status for {a.company ?? a.title}</span>
        <select
          value={a.status}
          onChange={(e) => onStatus(e.target.value as Status)}
          className="pill w-full !py-2"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Next step for {a.company ?? a.title}</span>
        <input
          className="field !py-2 !text-[14px]"
          placeholder="Next step, e.g. online test by Fri"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          onBlur={() => next !== (a.next_step ?? "") && onSave({ next_step: next })}
        />
      </label>
    </div>
  );
}
