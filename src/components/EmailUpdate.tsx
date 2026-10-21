"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusConfirm, { NO_EVENT, clearedDates, type StatusChange } from "@/components/StatusConfirm";
import { analyzeEmail, type EmailUpdate as Suggestion } from "@/lib/ai-client";
import { STATUSES, formatDate, type Application, type Status } from "@/lib/applications";
import { eventLabel } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";

export type EmailRole = Pick<
  Application,
  "id" | "title" | "company" | "role" | "status" | "submitted_on" | "assessment_on" | "interview_on" | "offer_on"
> & { event_at?: string | null; event_kind?: StatusChange["eventKind"] };

const label = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;
const nameOf = (r: EmailRole) => r.company ?? r.title;

/**
 * Paste an email from a company; the AI reads what changed (stage, interview date, next step) and
 * suggests the update. Nothing changes until you press Apply, and status changes still ask to confirm.
 */
export default function EmailUpdate({
  roles,
  fixed = false,
  onApplied,
}: {
  roles: EmailRole[];
  /** On a role page: the one role, no picker. */
  fixed?: boolean;
  onApplied?: (id: string, patch: Partial<Application> & Record<string, unknown>) => void;
}) {
  const [id, setId] = useState(fixed ? (roles[0]?.id ?? "") : "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<Suggestion | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const role = roles.find((r) => r.id === id);

  async function read() {
    if (!id) return setErr("Pick the role this email is about.");
    setBusy(true);
    setErr(null);
    setS(null);
    setDone(null);
    try {
      setS(await analyzeEmail(id, text));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't read the email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      {!fixed && (
        <div>
          <label htmlFor="em-role" className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
            Which role is it about?
          </label>
          <select id="em-role" className="field !py-2 !text-[14px]" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Choose a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {[nameOf(r), r.role].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label
          htmlFor={`em-text-${fixed ? id : "any"}`}
          className="mb-1 block text-[12px] font-bold text-[var(--ink2)]"
        >
          Paste the email
        </label>
        <textarea
          id={`em-text-${fixed ? id : "any"}`}
          rows={5}
          className="field !text-[14px]"
          placeholder="e.g. Thanks for applying… we'd like to invite you to a video interview on Tuesday 28 October at 10:00…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-1 text-[12px] text-[var(--mute)]">
          Read once by Google Gemini and not saved. You can delete phone numbers or other details it doesn&apos;t need.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn !py-2" disabled={busy || text.trim().length < 20} onClick={read}>
          {busy ? "Reading…" : "Read the email"}
        </button>
        {busy && <span className="spin" aria-hidden="true" />}
        {done && (
          <span role="status" className="text-[13px] font-bold text-[var(--good)]">
            {done}
          </span>
        )}
      </div>
      {err && (
        <p role="alert" className="alert">
          {err}
        </p>
      )}

      {s && role && (
        <SuggestionCard
          role={role}
          s={s}
          onDismiss={() => setS(null)}
          onDone={(patch) => {
            setDone(`Updated ${nameOf(role)}.`);
            setS(null);
            setText("");
            onApplied?.(role.id, patch);
          }}
        />
      )}
    </div>
  );
}

/** What an email changes for one role, with Apply (through the status confirmation) and Dismiss. */
export function SuggestionCard({
  role,
  s,
  onDone,
  onDismiss,
}: {
  role: EmailRole;
  s: Suggestion;
  onDone: (patch: Partial<Application> & Record<string, unknown>) => void;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<StatusChange | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const newStatus = s.status !== "no_change" ? (s.status as Status) : null;
  const hasEvent = !!s.event_at && s.event_kind !== "none";

  function apply() {
    if (newStatus) {
      setPending({
        name: nameOf(role),
        from: role.status,
        to: newStatus,
        // A new date from the email replaces the old one, so only offer removal when there's none.
        eventAt: hasEvent ? null : (role.event_at ?? null),
        eventKind: role.event_kind ?? null,
        dates: role,
      });
    } else save(false);
  }

  async function save(removeEvent: boolean) {
    setPending(null);
    const patch: Record<string, unknown> = {};
    if (newStatus) Object.assign(patch, { status: newStatus }, clearedDates(newStatus, role));
    if (removeEvent) Object.assign(patch, NO_EVENT);
    if (hasEvent) {
      Object.assign(patch, {
        event_at: new Date(s.event_at).toISOString(),
        event_kind: s.event_kind,
        event_minutes: Math.min(720, Math.max(5, s.event_minutes || 60)),
        event_location: s.event_location || null,
      });
    }
    if (s.next_step) patch.next_step = s.next_step;
    if (s.deadline) patch.deadline = s.deadline;
    const { error } = await createClient().from("applications").update(patch).eq("id", role.id);
    if (error) return setErr(`Couldn't save: ${error.message}`);
    onDone(patch);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-white p-4" role="status">
        <p className="text-[15px]">
          <b>{nameOf(role)}:</b> {s.summary || "Nothing new in this email."}
        </p>
        {s.found && (newStatus || hasEvent || s.next_step || s.deadline) ? (
          <>
            <ul className="grid gap-1 text-[14px] text-[var(--ink2)]">
              {newStatus && (
                <li>
                  Status: {label(role.status)} → <b className="text-[var(--ink)]">{label(newStatus)}</b>
                </li>
              )}
              {hasEvent && (
                <li>
                  {s.event_kind === "assessment" ? "Assessment" : s.event_kind === "other" ? "Next step" : "Interview"}:{" "}
                  <b className="text-[var(--ink)]">{eventLabel(new Date(s.event_at).toISOString())}</b>
                  {s.event_location && ` · ${s.event_location}`}
                </li>
              )}
              {s.next_step && <li>Next step: {s.next_step}</li>}
              {s.deadline && <li>Deadline: {formatDate(s.deadline)}</li>}
            </ul>
            <span className="flex flex-wrap gap-2">
              <button type="button" className="btn !py-2" onClick={apply}>
                Apply
              </button>
              <button type="button" className="btn btn-ghost !py-2" onClick={onDismiss}>
                Dismiss
              </button>
            </span>
          </>
        ) : (
          <p className="text-[13px] text-[var(--ink2)]">No update found for this role, so nothing changes.</p>
        )}
      </div>
      {err && (
        <p role="alert" className="alert">
          {err}
        </p>
      )}
      <StatusConfirm change={pending} onCancel={() => setPending(null)} onConfirm={save} />
    </>
  );
}
