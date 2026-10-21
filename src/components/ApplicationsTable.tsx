"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STATUSES, daysUntil, formatDate, titleCase, type Application, type Status } from "@/lib/applications";
import CloseIcon from "@/components/CloseIcon";
import { type EventFields } from "@/components/EventPanel";
import { eventLabel } from "@/lib/calendar";
import Arrow from "@/components/Arrow";
import Dialog from "@/components/Dialog";
import EmailUpdate from "@/components/EmailUpdate";
import { useTasks } from "@/components/Tasks";
import StatusConfirm, { NO_EVENT, clearedDates, type StatusChange } from "@/components/StatusConfirm";
import { createClient } from "@/lib/supabase/client";

/** Each stat in its own light colour: submitted lilac, interview or test blue, offer green, rejected red. */
const KPI_TONE: Partial<Record<Status, string>> = {
  submitted: "!bg-[var(--lilac)]",
  interview: "!bg-[var(--sky)]",
  offer: "!bg-[var(--goodbg)]",
  rejected: "!bg-[var(--badbg)]",
};

const GROUPS: { title: string; statuses: Status[]; tone: string }[] = [
  { title: "Interviews and assessments", statuses: ["interview", "assessment"], tone: "bg-[var(--warnbg)] text-[var(--warn)]" },
  { title: "Offers", statuses: ["offer"], tone: "bg-[var(--goodbg)] text-[var(--good)]" },
  { title: "Submitted, waiting to hear back", statuses: ["submitted"], tone: "bg-[var(--card2)] text-[var(--ink)]" },
  { title: "Rejected or withdrawn", statuses: ["rejected", "withdrawn"], tone: "bg-[var(--badbg)] text-[var(--bad)]" },
];

/** Six columns from large screens up; below that each row stacks. */
const COLS = "lg:grid-cols-[minmax(0,1.75fr)_76px_150px_minmax(0,1.1fr)_minmax(0,1.5fr)_36px]";

/** What the latest email about a role says, in a word. */
const MAIL_STATE: Record<string, string> = {
  submitted: "Confirmed",
  assessment: "Replied",
  interview: "Replied",
  offer: "Replied",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

type Mail = { at: string; summary: string; status: string; link: string | null };

const GMAIL_NOTE: Record<string, string> = {
  cancelled: "Gmail wasn't connected: the Google window was closed or access was declined.",
  noscope: "Gmail wasn't connected: please tick the box that lets rookie read your emails.",
  failed: "Gmail couldn't be connected. Please try again.",
  unavailable: "Email checks aren't switched on here yet. Paste an email instead.",
};

export default function ApplicationsTable({
  initial,
  events: initialEvents = {},
  gmail = null,
  readEmails = true,
  fromEmail = {},
}: {
  initial: Application[];
  events?: Record<string, EventFields>;
  /** Result of connecting Gmail, from the address Google sends the user back to. */
  gmail?: string | null;
  /** Off when the user switched off email reading on their Profile: no email buttons. */
  readEmails?: boolean;
  /** Roles whose current stage was set automatically from an email. */
  fromEmail?: Record<string, { at: string; summary: string; status: string; link: string | null }>;
}) {
  const { checkEmails, checking, emailResults, clearEmailResults } = useTasks();
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

  const [removing, setRemoving] = useState<Application | null>(null);
  async function removeRole(a: Application) {
    setRemoving(null);
    setItems((prev) => prev.filter((x) => x.id !== a.id));
    const { error } = await createClient().from("applications").delete().eq("id", a.id);
    if (error) {
      setItems((prev) => [...prev, a]);
      setError(`Couldn't remove it: ${error.message}`);
    }
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
        {items.length > 0 && readEmails && (
          <span className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn !py-2.5" disabled={checking} onClick={() => checkEmails()}>
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
        {emailResults && (
          <div role="status" className="mt-5 rounded-[22px] border border-[var(--good)] bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-bold">
                Updated {emailResults.changes.length} application{emailResults.changes.length > 1 ? "s" : ""}.
              </p>
              <button
                type="button"
                aria-label="Close"
                className="grid size-7 flex-none place-items-center rounded-full text-[var(--mute)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
                onClick={clearEmailResults}
              >
                <CloseIcon size={11} />
              </button>
            </div>
            <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-[14px]">
              {emailResults.changes.map((c, i) => (
                <li key={`${c.id}-${i}`}>
                  <Link href={`/app/a/${c.id}`} className="font-bold no-underline hover:underline">
                    {c.company}
                  </Link>
                  <span className="text-[var(--ink2)]">
                    : {c.status}
                    {c.next && ` · ${c.next}`}
                  </span>
                  {c.link && (
                    <>
                      <span className="text-[12.5px] text-[var(--mute)]"> · {emailResults.accounts > 1 && c.account ? c.account : "Gmail"} · </span>
                      <a href={c.link} target="_blank" rel="noopener noreferrer" className="font-bold">
                        Open email <Arrow />
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {emailResults.review > 0 && (
              <p className="mt-2 text-[13px] text-[var(--ink2)]">
                {emailResults.review} more email{emailResults.review > 1 ? "s" : ""} to review in the bell.
              </p>
            )}
          </div>
        )}
        <div className="kpis mt-6">
          {(["submitted", "interview", "offer", "rejected"] as Status[]).map((s) => (
            <div key={s} className={`kpi ${KPI_TONE[s]}`}>
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
          <div className={`hidden gap-4 px-7 pt-6 pb-2 lg:grid ${COLS}`}>
            {["Company", "Applied", "Status", "Email", "Next"].map((h) => (
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
                    mail={fromEmail[a.id]}
                    onSave={(p) => save(a.id, p)}
                    onRemove={() => setRemoving(a)}
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
        open={!!removing}
        title={removing ? `Remove ${removing.company ?? removing.title}?` : ""}
        onCancel={() => setRemoving(null)}
        actions={[
          { label: "Keep it", tone: "ghost", onClick: () => setRemoving(null) },
          { label: "Remove", tone: "danger", onClick: () => removing && removeRole(removing) },
        ]}
      >
        <p>
          It disappears from your Applications, Calendar and Board, with its CV and cover letter drafts and notes. Copies
          you saved in your Library stay. This can&apos;t be undone.
        </p>
      </Dialog>
      <Dialog
        open={emailOpen}
        title="Got an email from a company?"
        onCancel={() => setEmailOpen(false)}
        actions={[{ label: "Close", tone: "ghost", onClick: () => setEmailOpen(false) }]}
      >
        <p className="mb-3">Paste it and rookie suggests the new status, interview date and next step.</p>
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

/** "Due Fri 23 Oct, 09:22 · 2 days left": the next date that matters for this role, coloured by how close it is. */
function dueLine(a: Application, ev?: EventFields) {
  const at = ev?.event_at ?? null;
  const day = at ? `${new Date(at).getFullYear()}-${String(new Date(at).getMonth() + 1).padStart(2, "0")}-${String(new Date(at).getDate()).padStart(2, "0")}` : a.deadline;
  if (!day) return null;
  const n = daysUntil(day);
  if (n < -1) return null;
  const when = at
    ? eventLabel(at)
    : new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const verb = at && ev?.event_kind === "interview" ? "Interview" : "Due";
  const left = n < 0 ? "yesterday" : n === 0 ? "today" : n === 1 ? "1 day left" : `${n} days left`;
  const tone = n <= 2 ? "text-[var(--bad)]" : n <= 5 ? "text-[var(--warn)]" : "text-[var(--good)]";
  return { text: `${verb} ${when}`, left, tone };
}

function Row({
  a,
  ev,
  mail,
  onSave,
  onStatus,
  onRemove,
}: {
  a: Application;
  ev?: EventFields;
  mail?: Mail;
  onSave: (p: Partial<Application>) => void;
  onStatus: (s: Status) => void;
  onRemove: () => void;
}) {
  const [next, setNext] = useState(a.next_step ?? "");
  const due = dueLine(a, ev);
  const name = a.company ?? a.title;
  // Where this stage came from: the calendar note, the email that set it, or the user.
  const note = ev?.event_note || (mail && mail.status === a.status && mail.summary) || (mail ? "Updated by you" : "Added by you");
  const state = mail ? (MAIL_STATE[mail.status] ?? "Email") : null;
  return (
    <div className={`grid gap-3 border-b border-[var(--line)] px-3 py-5 last:border-0 lg:items-center lg:gap-4 ${COLS}`}>
      <div className="min-w-0">
        <Link href={`/app/a/${a.id}`} className="text-[17px] font-bold tracking-tight no-underline hover:underline">
          {name}
        </Link>
        {a.company && <p className="text-[15px] font-light text-[var(--ink)]">{titleCase(a.role ?? a.title)}</p>}
        {due && (
          <p className="mt-1.5 text-[14px]">
            <b className={due.tone}>{due.text}</b>
            <span className="text-[var(--ink2)]"> · {due.left}</span>
          </p>
        )}
        <p className="mt-1 text-[13px] leading-snug text-[var(--mute)]">{note}</p>
        <Link href={`/app/a/${a.id}`} className="mt-1.5 inline-block text-[13px] font-bold underline underline-offset-4">
          Edit
        </Link>
      </div>

      <span className="text-[14px] text-[var(--ink2)]">
        <span className="cap mr-2 lg:hidden">Applied</span>
        {a.submitted_on ? formatDate(a.submitted_on) : "–"}
      </span>

      <label className="block">
        <span className="cap mb-1 block lg:hidden">Status</span>
        <span className="sr-only">Status for {name}</span>
        <select value={a.status} onChange={(e) => onStatus(e.target.value as Status)} className="pill h-10 w-full !py-0 !text-[14px]">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="cap mb-1 block lg:hidden">Email</span>
        <span className="flex items-center gap-2">
          <span
            className={`pill h-10 min-w-0 flex-1 !py-0 !text-[14px] ${state ? "" : "!text-[var(--mute)]"}`}
            title={mail ? `From an email · ${formatDate(mail.at.slice(0, 10))}` : "No email about this role yet"}
          >
            {state ?? "No email yet"}
          </span>
          {mail?.link ? (
            <a
              href={mail.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the email from ${name}`}
              className="grid size-10 flex-none place-items-center rounded-full border border-[var(--line2)] bg-white text-[var(--ink)] no-underline hover:border-[var(--ink)]"
            >
              <Arrow size={14} />
            </a>
          ) : (
            <span className="size-10 flex-none" aria-hidden="true" />
          )}
        </span>
      </div>

      <label className="block">
        <span className="cap mb-1 block lg:hidden">Next</span>
        <span className="sr-only">Next step for {name}</span>
        <textarea
          rows={1}
          className="block w-full resize-none rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-[14.5px] leading-relaxed text-[var(--ink)] [field-sizing:content] placeholder:text-[var(--mute)] hover:border-[var(--line2)] focus:border-[var(--ink)] focus:bg-white focus:outline-none"
          placeholder="Add a next step"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          onBlur={() => next !== (a.next_step ?? "") && onSave({ next_step: next })}
        />
      </label>

      <button
        type="button"
        aria-label={`Remove ${name}`}
        title="Remove"
        className="grid size-9 place-items-center justify-self-end rounded-full border border-[var(--line2)] text-[var(--mute)] hover:border-[var(--bad)] hover:text-[var(--bad)]"
        onClick={onRemove}
      >
        <CloseIcon size={11} />
      </button>
    </div>
  );
}
