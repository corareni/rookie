"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CalendarButtons from "@/components/CalendarButtons";
import type { CalItem } from "@/components/CalendarView";
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

const what = (k: EventFields["event_kind"] | undefined) => (k === "assessment" ? "Assessment" : k === "other" ? "Next step" : "Interview");

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

/** A scheduled interview or assessment: add it to your calendar, edit it or delete it. */
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

  async function remove() {
    if (!item) return;
    const { error } = await createClient().from("applications").update(NO_EVENT).eq("id", item.appId);
    if (error) return setErr(`Couldn't delete: ${error.message}`);
    onClose();
    router.refresh();
  }

  const event = item
    ? buildEvent(
        { id: item.appId, company: item.company, role: item.role, title: item.company, job_url: item.job_url, next_step: item.next_step },
        { event_at: item.at!, event_minutes: item.minutes ?? 60, event_location: item.location ?? null, event_kind: item.eventKind ?? null },
      )
    : null;

  return (
    <Dialog
      open={!!item}
      title={item ? (confirm ? `Delete this ${what(item.eventKind).toLowerCase()}?` : `${what(item.eventKind)} · ${item.company}`) : ""}
      onCancel={onClose}
      actions={
        confirm
          ? [
              { label: "Keep it", tone: "ghost", onClick: () => setConfirm(false) },
              { label: "Delete", tone: "danger", onClick: remove },
            ]
          : [
              { label: "Delete", tone: "ghost", onClick: () => setConfirm(true) },
              { label: "Edit", tone: "ghost", onClick: () => item && onEdit(item) },
              { label: "Done", onClick: onClose },
            ]
      }
    >
      {item &&
        (confirm ? (
          <p>
            It&apos;s removed from Rookie. If you added it to Google or Apple Calendar, delete it there as well.
          </p>
        ) : (
          <div className="grid gap-2">
            <p className="text-[var(--ink)]">
              <b>{eventLabel(item.at!)}</b>
              {item.minutes ? ` · ${item.minutes < 60 ? `${item.minutes} min` : `${item.minutes / 60} h`}` : ""}
            </p>
            {item.location && <p>{item.location}</p>}
            <Link href={`/app/a/${item.appId}`} className="font-bold" onClick={onClose}>
              {item.company} {item.role && <span className="font-light">{titleCase(item.role)}</span>} →
            </Link>
            {event && (
              <div className="mt-1">
                <CalendarButtons event={event} small />
              </div>
            )}
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
