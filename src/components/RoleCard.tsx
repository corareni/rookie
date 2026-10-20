"use client";

import Link from "next/link";
import { useState } from "react";
import { daysUntil, deadlineText, initials, scoreTone, type Application } from "@/lib/applications";

type Props = {
  a: Application;
  selected?: boolean;
  onToggleCompare?: () => void;
  onApply?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  onMoveToBoard?: () => void;
};

export default function RoleCard({ a, selected, onToggleCompare, onApply, onRemove, onRetry, onMoveToBoard }: Props) {
  const [confirm, setConfirm] = useState(false);
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
              <span className="text-[16px] text-[var(--ink2)]">{a.role}</span>
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
          {a.track && <span className="pill !cursor-default">{a.track}</span>}
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
          <p className={`mt-3 rounded-2xl px-3 py-2 text-sm ${a.verdict === "ruled_out" ? "chip-bad" : "chip-warn"}`}>
            {a.verdict_reason}
          </p>
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
      </div>

      <div className="flex flex-wrap items-center gap-2 md:max-w-[300px] md:justify-end md:self-start">
        {onApply && (
          <button type="button" className="btn !py-2" onClick={onApply}>
            Mark as applied
          </button>
        )}
        {onMoveToBoard && (
          <button type="button" className="btn btn-ghost !py-2" onClick={onMoveToBoard}>
            Move to board
          </button>
        )}
        <Link href={`/app/a/${a.id}#documents`} className="pill">
          CV + letter
        </Link>
        {onToggleCompare && (
          <button type="button" className="pill" aria-pressed={!!selected} onClick={onToggleCompare}>
            {selected ? "✓ Comparing" : "+ Compare"}
          </button>
        )}
        {a.job_url && (
          <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="px-1 text-[14px] font-semibold">
            Listing ↗
          </a>
        )}
        {onRemove &&
          (confirm ? (
            <span className="flex items-center gap-1 text-sm">
              <button type="button" className="btn btn-danger !px-3 !py-1.5 !text-sm" onClick={onRemove}>
                Remove
              </button>
              <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Remove ${a.company ?? a.title}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line2)] text-[var(--ink2)]"
              onClick={() => setConfirm(true)}
            >
              ×
            </button>
          ))}
      </div>
    </article>
  );
}
