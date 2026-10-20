"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  CLOSED_STATUSES,
  COLUMNS,
  OPEN_STATUSES,
  STATUSES,
  daysUntil,
  deadlineText,
  formatDate,
  isUrl,
  isoInDays,
  statusLabel,
  type Application,
  type Status,
} from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";

export default function Board({ initial, loadError }: { initial: Application[]; loadError: string | null }) {
  const [items, setItems] = useState<Application[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(loadError);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function add(title: string, extra: Partial<Application> = {}) {
    const clean = title.trim();
    if (!clean) {
      setError("Type a role or paste a job link first.");
      return false;
    }
    if (clean.length > 500) {
      setError("That's a bit long. Keep it under 500 characters.");
      return false;
    }
    setSaving(true);
    setError(null);
    const { data, error } = await createClient()
      .from("applications")
      .insert({ title: clean, job_url: isUrl(clean) ? clean : null, ...extra })
      .select(COLUMNS)
      .single();
    setSaving(false);
    if (error) {
      setError(`Couldn't save: ${error.message}`);
      return false;
    }
    setItems((prev) => [data as Application, ...prev]);
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (await add(text)) {
      setText("");
      inputRef.current?.focus();
    }
  }

  async function changeStatus(id: string, status: Status) {
    const before = items;
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const { data, error } = await createClient()
      .from("applications")
      .update({ status })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) {
      setItems(before);
      setError(`Couldn't update: ${error.message}`);
      return;
    }
    setItems((prev) => prev.map((a) => (a.id === id ? (data as Application) : a)));
  }

  const stats = useMemo(() => {
    const reached = (s: Status) => items.filter((a) => a.status === s).length;
    const sent: Status[] = ["submitted", "assessment", "interview", "offer"];
    const submitted = items.filter((a) => a.submitted_on || sent.includes(a.status)).length;
    const dueThisWeek = items.filter(
      (a) => a.deadline && a.status === "interested" && daysUntil(a.deadline) >= 0 && daysUntil(a.deadline) <= 7,
    ).length;
    return { total: items.length, submitted, interviews: reached("interview"), dueThisWeek };
  }, [items]);

  const closed = items.filter((a) => CLOSED_STATUSES.includes(a.status));

  return (
    <main className="pt-4">
      <p className="cap">Your board</p>
      <h1 className="mt-2 text-[clamp(32px,6vw,52px)] font-medium leading-none tracking-[-0.04em]">
        Every application, <em>one place.</em>
      </h1>

      <form onSubmit={onSubmit} className="card mt-6 !bg-[var(--paper)] !border-transparent">
        <label htmlFor="core-input" className="label">
          Paste a job link, or type the role
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="core-input"
            ref={inputRef}
            data-testid="core-input"
            type="text"
            className="field flex-1"
            placeholder="https://… or Marketing Intern @ Spotify"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
          />
          <button data-testid="core-submit" type="submit" className="btn btn-lg" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error && (
          <p role="alert" className="alert mt-3">
            {error}
          </p>
        )}
      </form>

      <p className="mt-4 text-sm text-[var(--ink2)]" aria-live="polite">
        {stats.total} tracked · {stats.submitted} submitted · {stats.interviews} in interviews ·{" "}
        {stats.dueThisWeek} {stats.dueThisWeek === 1 ? "deadline" : "deadlines"} this week
      </p>

      {items.length === 0 ? (
        <div className="card mt-6 text-center">
          <p className="text-lg font-semibold">No applications yet.</p>
          <p className="mt-1 text-[var(--ink2)]">Paste a job link or type a role you&apos;re interested in above.</p>
          <button
            type="button"
            className="btn btn-ghost mt-4"
            onClick={() =>
              add("Summer Analyst Intern @ Example Bank", {
                deadline: isoInDays(10),
                notes: "Example role. Change the status, add a deadline, or delete it when you're ready.",
              })
            }
          >
            Add an example role
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-5 lg:gap-3">
          {OPEN_STATUSES.map((s) => {
            const col = items.filter((a) => a.status === s);
            return (
              <section key={s} aria-labelledby={`col-${s}`} className="min-w-0">
                <h2 id={`col-${s}`} className="mb-2 flex items-baseline gap-2 text-[13px] font-semibold text-[var(--ink2)]">
                  {statusLabel(s)} <span className="text-[var(--mute)]">· {col.length}</span>
                </h2>
                <div className="grid gap-2">
                  {col.map((a) => (
                    <Card key={a.id} a={a} onStatus={changeStatus} />
                  ))}
                  {col.length === 0 && (
                    <p className="hidden rounded-2xl border border-dashed border-[var(--line2)] p-3 text-xs text-[var(--mute)] lg:block">
                      Nothing here yet
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ink2)]">
            Rejected or withdrawn · {closed.length}
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {closed.map((a) => (
              <Card key={a.id} a={a} onStatus={changeStatus} />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}

function Card({ a, onStatus }: { a: Application; onStatus: (id: string, s: Status) => void }) {
  const headline = a.role && a.company ? `${a.role} @ ${a.company}` : null;
  const urgent = a.status === "interested" || a.status === "submitted";
  const days = a.deadline ? daysUntil(a.deadline) : null;
  const deadlineChip =
    a.deadline && days !== null
      ? days < 0 && urgent
        ? "chip-bad"
        : days <= 7 && urgent
          ? "chip-warn"
          : "chip-mute"
      : null;

  return (
    <article data-testid="core-item" className="card !p-4">
      {headline && <p className="font-semibold leading-snug">{headline}</p>}
      <Link
        href={`/app/a/${a.id}`}
        className={
          headline
            ? "mt-0.5 block text-xs text-[var(--mute)] break-anywhere line-clamp-2"
            : "block font-semibold leading-snug break-anywhere line-clamp-3 no-underline hover:underline"
        }
      >
        {a.title}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {a.deadline && deadlineChip && (
          <span className={`chip ${deadlineChip}`} title={`Deadline ${formatDate(a.deadline)}`}>
            {deadlineText(a.deadline)}
          </span>
        )}
        {a.submitted_on && a.status !== "interested" && (
          <span className="text-xs text-[var(--mute)]">Sent {formatDate(a.submitted_on)}</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="sr-only" htmlFor={`status-${a.id}`}>
          Status
        </label>
        <select
          id={`status-${a.id}`}
          value={a.status}
          onChange={(e) => onStatus(a.id, e.target.value as Status)}
          className="rounded-full border border-[var(--line2)] bg-[var(--bg)] px-3 py-1.5 text-[13px] font-medium"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Link href={`/app/a/${a.id}`} className="text-[13px] font-semibold">
          Open
        </Link>
      </div>
    </article>
  );
}
