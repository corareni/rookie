"use client";

import Arrow from "@/components/Arrow";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CalendarButtons from "@/components/CalendarButtons";
import { itemLabel, type CalItem } from "@/components/CalendarView";
import Dialog from "@/components/Dialog";
import { buildEvent, type EventFields } from "@/components/EventPanel";
import { NO_EVENT } from "@/components/StatusConfirm";
import { titleCase } from "@/lib/applications";
import { eventLabel } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";

export type Draft = {
  appId: string;
  local: string;
  minutes: number;
  kind: NonNullable<EventFields["event_kind"]>;
  location: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** `datetime-local` value for a date, e.g. "2026-10-24T09:00". */
export const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const KINDS = [
  { v: "interview", label: "Interview" },
  { v: "assessment", label: "Assessment or test" },
  { v: "other", label: "Other (call, case study, deadline)" },
] as const;


/** Add or edit the date of an interview or assessment. One date per role, so picking a role that has one replaces it. */
export function EventDialog({
  draft,
  roles,
  taken,
  onClose,
}: {
  draft: Draft | null;
  roles: { id: string; name: string }[];
  /** Roles that already have a date, with that date. */
  taken: Record<string, string>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [d, setD] = useState<Draft | null>(draft);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset the form whenever a new draft is opened.
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setD(draft);
    setErr(null);
  }

  async function save() {
    if (!d) return;
    if (!d.appId) return setErr("Pick the role this is for.");
    if (!d.local) return setErr("Pick a date and time.");
    setBusy(true);
    const { error } = await createClient()
      .from("applications")
      .update({
        event_at: new Date(d.local).toISOString(),
        event_minutes: d.minutes,
        event_kind: d.kind,
        event_location: d.location.trim() || null,
      })
      .eq("id", d.appId);
    setBusy(false);
    if (error) return setErr(`Couldn't save: ${error.message}`);
    onClose();
    router.refresh();
  }

  const set = (p: Partial<Draft>) => d && setD({ ...d, ...p });
  const replaces = d?.appId && taken[d.appId] && toLocalInput(new Date(taken[d.appId])) !== d.local ? taken[d.appId] : null;

  return (
    <Dialog
      open={!!draft}
      title={draft?.appId && taken[draft.appId] ? "Edit event" : "Add an event"}
      onCancel={onClose}
      actions={[
        { label: "Cancel", tone: "ghost", onClick: onClose },
        { label: busy ? "Saving…" : "Save event", onClick: save },
      ]}
    >
      {d && (
        <div className="grid gap-3 text-[var(--ink)]">
          <div>
            <label htmlFor="ce-role" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
              Which role
            </label>
            <select id="ce-role" className="field !py-2 !text-[14px]" value={d.appId} onChange={(e) => set({ appId: e.target.value })}>
              <option value="">Choose a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ce-kind" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                What is it?
              </label>
              <select id="ce-kind" className="field !py-2 !text-[14px]" value={d.kind} onChange={(e) => set({ kind: e.target.value as Draft["kind"] })}>
                {KINDS.map((k) => (
                  <option key={k.v} value={k.v}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ce-min" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                How long
              </label>
              <select id="ce-min" className="field !py-2 !text-[14px]" value={d.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
                {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ce-at" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
              Date and time
            </label>
            <input id="ce-at" type="datetime-local" className="field !py-2 !text-[14px]" value={d.local} onChange={(e) => set({ local: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ce-loc" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
              Where (address or video link)
            </label>
            <input
              id="ce-loc"
              className="field !py-2 !text-[14px]"
              placeholder="e.g. Google Meet link"
              value={d.location}
              onChange={(e) => set({ location: e.target.value })}
            />
          </div>
          {replaces && (
            <p className="text-[13px] text-[var(--ink2)]">
              This role already has a date ({eventLabel(replaces)}). Saving replaces it.
            </p>
          )}
          {err && (
            <p role="alert" className="text-[13px] font-bold text-[var(--bad)]">
              {err}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

const STATUS: Record<string, string> = {
  interested: "On your board",
  submitted: "Submitted",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const DATE_COLUMN: Record<Exclude<CalItem["kind"], "scheduled">, string> = {
  applied: "submitted_on",
  deadline: "deadline",
  assessment: "assessment_on",
  interview: "interview_on",
  offer: "offer_on",
};

const CURRENT_STAGE: Partial<Record<CalItem["kind"], string>> = {
  applied: "submitted",
  assessment: "assessment",
  interview: "interview",
  offer: "offer",
};

const WHAT: Record<CalItem["kind"], string> = {
  scheduled: "",
  applied: "You sent your application.",
  deadline: "Last day to apply.",
  assessment: "You reached the assessment stage.",
  interview: "You reached the interview stage.",
  offer: "You received an offer.",
};

/**
 * Details of any calendar entry, with a link to the role. Scheduled interviews and assessments can
 * also go to Google or Apple Calendar, be edited or deleted.
 */
export function EventDetails({ item, onClose, onEdit }: { item: CalItem | null; onClose: () => void; onEdit: (i: CalItem) => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [prev, setPrev] = useState(item);
  if (item !== prev) {
    setPrev(item);
    setConfirm(false);
    setErr(null);
  }

  /** Takes just this entry off the calendar by clearing its date. */
  async function remove() {
    if (!item) return;
    const patch = item.kind === "scheduled" ? NO_EVENT : { [DATE_COLUMN[item.kind]]: null };
    const { error } = await createClient().from("applications").update(patch).eq("id", item.appId);
    if (error) return setErr(`Couldn't delete: ${error.message}`);
    onClose();
    router.refresh();
  }

  /** Deletes the whole role, with its documents and dates. */
  async function deleteRole() {
    if (!item) return;
    const { error } = await createClient().from("applications").delete().eq("id", item.appId);
    if (error) return setErr(`Couldn't delete: ${error.message}`);
    onClose();
    router.refresh();
  }

  const scheduled = item?.kind === "scheduled";
  // A stage date for the role's current status is set again automatically, so only a status change removes it.
  const current = !!item && !scheduled && CURRENT_STAGE[item.kind] === item.status;
  const event =
    item && scheduled
      ? buildEvent(
          { id: item.appId, company: item.company, role: item.role, title: item.company, job_url: item.job_url, next_step: item.next_step },
          { event_at: item.at!, event_minutes: item.minutes ?? 60, event_location: item.location ?? null, event_kind: item.eventKind ?? null },
        )
      : null;
  const openRole = () => {
    if (!item) return;
    onClose();
    router.push(`/app/a/${item.appId}`);
  };
  const when = item
    ? item.at
      ? eventLabel(item.at)
      : new Date(`${item.day}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <Dialog
      open={!!item}
      title={item ? (confirm ? "What do you want to delete?" : `${itemLabel(item)} · ${item.company}`) : ""}
      onCancel={onClose}
      actions={
        confirm
          ? [
              { label: "Cancel", tone: "ghost", onClick: () => setConfirm(false) },
              ...(current ? [] : [{ label: "Remove from calendar", tone: "ghost" as const, onClick: remove }]),
              { label: "Delete the whole role", tone: "danger", onClick: deleteRole },
            ]
          : [
              { label: "Delete", tone: "ghost", onClick: () => setConfirm(true) },
              ...(scheduled ? [{ label: "Edit", tone: "ghost" as const, onClick: () => item && onEdit(item) }] : []),
              { label: "Open role →", onClick: openRole },
            ]
      }
    >
      {item &&
        (confirm ? (
          <div className="grid gap-2">
            {current ? (
              <p>
                This is the role&apos;s current stage, so it stays on the calendar until you change the status. You can
                delete the whole role instead.
              </p>
            ) : (
              <p>
                <b>Remove from calendar</b> takes only this {itemLabel(item).toLowerCase()} ({when}) off your calendar.
              </p>
            )}
            <p>
              <b>Delete the whole role</b> removes {item.company} from Rookie: its board card, CV and cover letter
              drafts, notes and every date. Copies saved in your Library stay. This can&apos;t be undone.
            </p>
            {scheduled && <p className="text-[13px]">If you added it to Google or Apple Calendar, delete it there as well.</p>}
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-[var(--ink)]">
              <b>{when}</b>
              {scheduled && item.minutes ? ` · ${item.minutes < 60 ? `${item.minutes} min` : `${item.minutes / 60} h`}` : ""}
              {!scheduled && <span className="block text-[var(--ink2)]">{WHAT[item.kind]}</span>}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-[var(--tile)] p-3 text-[13.5px]">
              <dt className="text-[var(--mute)]">Role</dt>
              <dd className="text-[var(--ink)]">
                <b>{item.company}</b> {item.role && <span className="font-light">{titleCase(item.role)}</span>}
              </dd>
              {item.place && (
                <>
                  <dt className="text-[var(--mute)]">Job based in</dt>
                  <dd>{item.place}</dd>
                </>
              )}
              {item.status && (
                <>
                  <dt className="text-[var(--mute)]">Status now</dt>
                  <dd>{STATUS[item.status] ?? item.status}</dd>
                </>
              )}
              {scheduled && item.location && (
                <>
                  <dt className="text-[var(--mute)]">Where</dt>
                  <dd className="break-anywhere">{item.location}</dd>
                </>
              )}
              {item.next_step && (
                <>
                  <dt className="text-[var(--mute)]">Next step</dt>
                  <dd>{item.next_step}</dd>
                </>
              )}
              {item.job_url && (
                <>
                  <dt className="text-[var(--mute)]">Job ad</dt>
                  <dd>
                    <a href={item.job_url} target="_blank" rel="noopener noreferrer" className="font-bold">
                      Open listing <Arrow />
                    </a>
                  </dd>
                </>
              )}
            </dl>
            {event && <CalendarButtons event={event} small />}
          </div>
        ))}
      {err && (
        <p role="alert" className="mt-2 text-[13px] font-bold text-[var(--bad)]">
          {err}
        </p>
      )}
    </Dialog>
  );
}
