"use client";

import Link from "next/link";
import { useState } from "react";
import { daysUntil, deadlineText, initials, scoreTone, titleCase, type Application } from "@/lib/applications";

type Props = {
  a: Application;
  selected?: boolean;
  onToggleCompare?: () => void;
  onApply?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  onMoveToBoard?: () => void;
  /** Saves the user's notes for this role; they're used when writing the CV and letter. */
  onSaveNotes?: (notes: string) => Promise<boolean>;
  /** Extra buttons shown first in the actions column (used on the Barriers page). */
  actions?: React.ReactNode;
};

export default function RoleCard({ a, selected, onToggleCompare, onApply, onRemove, onRetry, onMoveToBoard, onSaveNotes, actions }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(a.notes ?? "");
  const [notesMsg, setNotesMsg] = useState<string | null>(null);
  const analysed = !!(a.company && a.role);
  const days = a.deadline ? daysUntil(a.deadline) : null;

  return (
    <article data-testid="core-item" className={`role${selected ? " selected" : ""}`}>
      <div className="logo" aria-hidden="true">
        {initials(a)}
      </div>

      <div className="min-w-0">
        {analysed ? (
          <>
            <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{a.company}</span>
              <span className="text-[17px] font-light text-[var(--ink)]">{titleCase(a.role)}</span>
              {a.score && <span className={`score score-${scoreTone(a.score)}`}>{a.score}/10</span>}
            </h3>
            <Link href={`/app/a/${a.id}`} className="mt-1 block truncate text-xs text-[var(--mute)] no-underline hover:underline">
              {a.title}
            </Link>
          </>
        ) : (
          <h3 className="text-[18px] font-semibold leading-snug break-anywhere">
            <Link href={`/app/a/${a.id}`} className="no-underline hover:underline">
              {a.title}
            </Link>
          </h3>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[var(--ink2)]">
          {a.track && <span className="chip chip-mute">{a.track}</span>}
          {a.location && <span>{a.location}</span>}
          {a.deadline && days !== null ? (
            <span className={`chip ${days < 0 ? "chip-bad" : days <= 14 ? "chip-warn" : "chip-mute"}`}>
              {deadlineText(a.deadline)}
            </span>
          ) : (
            a.closes_note && <span>{a.closes_note}</span>
          )}
        </div>
        {a.timing && a.timing !== "Not stated" && <p className="mt-2 text-[14px] text-[var(--ink2)]">{a.timing}</p>}

        {a.job_status === "reading" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--ink2)]" role="status">
            <span className="spin" aria-hidden="true" /> Reading the listing…
          </p>
        )}
        {a.job_status === "failed" && (
          <p className="mt-3 text-sm text-[var(--bad)]">
            Couldn&apos;t read this page.{" "}
            <Link href={`/app/a/${a.id}`} className="font-semibold">
              Paste the description
            </Link>
            {onRetry && (
              <>
                {" "}
                or{" "}
                <button type="button" onClick={onRetry} className="font-semibold underline">
                  try again
                </button>
              </>
            )}
            .
          </p>
        )}

        {a.verdict !== "open" && a.verdict_reason && (
          <div className="mt-3 grid justify-items-start gap-1.5 rounded-2xl bg-white px-4 py-3 text-sm">
            <span className={`chip ${a.ai_flag === "deal_breaker" ? "chip-bad" : "chip-warn"}`}>
              {a.ai_flag === "deal_breaker" ? "Breaks a deal-breaker" : "Concern"}
            </span>
            <span>{a.verdict_reason}</span>
          </div>
        )}

        {(a.what || a.why || a.risk) && (
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-[15px] font-semibold">
              What they do, why you, the catch <span aria-hidden="true">+</span>
            </summary>
            <dl className="mt-2 grid gap-2 text-[14px] leading-relaxed text-[var(--ink2)]">
              {a.what && (
                <div>
                  <dt className="font-semibold text-[var(--ink)]">What they do</dt>
                  <dd>{a.what}</dd>
                </div>
              )}
              {a.why && (
                <div>
                  <dt className="font-semibold text-[var(--ink)]">Why you</dt>
                  <dd>{a.why}</dd>
                </div>
              )}
              {a.risk && (
                <div>
                  <dt className="font-semibold text-[var(--ink)]">The catch</dt>
                  <dd>{a.risk}</dd>
                </div>
              )}
            </dl>
          </details>
        )}

        {notesOpen && onSaveNotes && (
          <div className="mt-3 grid gap-2 rounded-2xl bg-white p-3">
            <label htmlFor={`notes-${a.id}`} className="text-[13px] font-bold">
              Your notes for this role <span className="font-light text-[var(--ink2)]">: used when Rookie writes your CV and letter</span>
            </label>
            <textarea
              id={`notes-${a.id}`}
              rows={3}
              className="field !text-[14px]"
              placeholder="e.g. Met their recruiter at the IE career fair. Mention my n8n automation project."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn !py-2"
                onClick={async () => setNotesMsg((await onSaveNotes(notes)) ? "Saved." : "Couldn't save.")}
              >
                Save notes
              </button>
              {notesMsg && (
                <span role="status" className="text-[13px] text-[var(--ink2)]">
                  {notesMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid content-start gap-2 md:w-[280px]">
        {actions && <div className="grid gap-2">{actions}</div>}
        {onApply && (
          <button type="button" className="btn w-full !py-2.5" onClick={onApply}>
            Mark as applied
          </button>
        )}
        {onMoveToBoard && (
          <button type="button" className="btn btn-ghost w-full !py-2.5" onClick={onMoveToBoard}>
            Move to board
          </button>
        )}
        <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-2">
          <Link href={`/app/a/${a.id}#documents`} className="act !bg-[var(--lilac)]">
            CV and Cover Letter
          </Link>
          {onToggleCompare && (
            <button type="button" className="act !bg-[var(--peach)] aria-pressed:!bg-[var(--lilac)]" aria-pressed={!!selected} onClick={onToggleCompare}>
              {selected ? "✓ Comparing" : "+ Compare"}
            </button>
          )}
          {onSaveNotes && (
            <button type="button" className="act" aria-expanded={notesOpen} onClick={() => setNotesOpen((o) => !o)}>
              {notes.trim() ? "✎ Notes" : "+ Notes"}
            </button>
          )}
          {a.job_url && (
            <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="act gap-1.5">
              Listing <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        {onRemove &&
          (confirm ? (
            <span className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-danger !py-2 !text-[13px]" onClick={onRemove}>
                Remove
              </button>
              <button type="button" className="btn btn-ghost !py-2 !text-[13px]" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Remove ${a.company ?? a.title}`}
              className="justify-self-end text-right text-[12.5px] text-[var(--mute)] hover:text-[var(--bad)]"
              onClick={() => setConfirm(true)}
            >
              Remove
            </button>
          ))}
      </div>
    </article>
  );
}
