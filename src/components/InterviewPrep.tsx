"use client";

import { useState } from "react";
import WritingAnimation from "@/components/WritingAnimation";

type Q = { q: string; why: string; tip: string; type: string };

const TONE: Record<string, string> = {
  Motivation: "bg-[var(--lilac)]",
  Behavioural: "bg-[var(--mint)]",
  "Role & skills": "bg-[var(--sky)]",
  "Case or technical": "bg-[var(--butter)]",
  Company: "bg-[var(--peach)]",
};

/** Practice questions for interviews and assessments, with a "more questions" button. */
export default function InterviewPrep({ id, initial, stage }: { id: string; initial: Q[]; stage: string }) {
  const [qs, setQs] = useState<Q[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(more: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, more }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't write questions. Try again.");
      setQs(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write questions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="interview" className="mt-8 scroll-mt-20" aria-labelledby="iv-h">
      <h2 id="iv-h" className="sec">
        <small>[ ]</small> Practise for your {stage === "assessment" ? "assessment" : "interview"}
      </h2>
      <div className="card mt-3 grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn" disabled={busy} onClick={() => run(qs.length > 0)}>
            {busy ? "Writing questions…" : qs.length ? "More questions" : "Practise interview questions"}
          </button>
          <p className="text-[14px] text-[var(--ink2)]">Realistic questions for this role and company, with tips from your own profile.</p>
        </div>
        {busy && <WritingAnimation />}
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        {qs.length > 0 && (
          <ol className="grid gap-2.5">
            {qs.map((q, i) => (
              <li key={q.q + i} className="rounded-2xl bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-[var(--mute)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`chip !text-[var(--ink)] ${TONE[q.type] ?? "bg-[var(--tile)]"}`}>{q.type}</span>
                </div>
                <p className="mt-2 text-[16px] font-bold leading-snug">{q.q}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[13.5px] font-bold">Why they ask it, and how you could answer</summary>
                  <p className="mt-2 text-[14px] text-[var(--ink2)]">
                    <b className="text-[var(--ink)]">Why:</b> {q.why}
                  </p>
                  <p className="mt-1 text-[14px] text-[var(--ink2)]">
                    <b className="text-[var(--ink)]">Your angle:</b> {q.tip}
                  </p>
                </details>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
