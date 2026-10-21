"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { analyzeRole } from "@/lib/ai-client";
import { isUrl, scoreTone, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";

export default function AnalysisPanel({ a }: { a: Application }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysed = a.job_status === "ready" && a.score;

  async function run(withText: boolean) {
    setBusy(true);
    setError(null);
    try {
      await analyzeRole(a.id, withText ? text : undefined);
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't analyse this role.");
    } finally {
      setBusy(false);
    }
  }

  /** Save a pasted job link on the role, then let rookie read it (fills in company, role, deadline and score). */
  async function readLink() {
    const url = link.trim();
    if (!isUrl(url)) return setError("Paste the full link, starting with http:// or https://");
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().from("applications").update({ job_url: url, job_text: null }).eq("id", a.id);
    if (e) {
      setBusy(false);
      return setError(`Couldn't save the link: ${e.message}`);
    }
    try {
      await analyzeRole(a.id);
      setLink("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that link. Paste the description instead.");
    } finally {
      setBusy(false);
    }
  }
  const missing = !a.company || !a.role;

  return (
    <section className="card mt-4" aria-labelledby="analysis">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="analysis" className="sec">
          <small>[01]</small> rookie&apos;s take
        </h2>
        {analysed && a.score && <span className={`score score-${scoreTone(a.score)}`}>{a.score}/10</span>}
      </div>

      {analysed ? (
        <dl className="mt-4 grid gap-3 text-[15px] leading-relaxed">
          {[
            ["What they do", a.what],
            ["Why you", a.why],
            ["The catch", a.risk],
            ["Timing", a.timing],
            ["Deadline", a.closes_note],
          ].map(
            ([k, v]) =>
              v && (
                <div key={k}>
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-[var(--ink2)]">{v}</dd>
                </div>
              ),
          )}
          {a.verdict !== "open" && (
            <div>
              <dt className="font-semibold">{a.verdict === "barrier" ? "Possible barrier" : "Ruled out"}</dt>
              <dd className="text-[var(--ink2)]">{a.verdict_reason}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-3 text-[var(--ink2)]">
          {a.job_status === "reading"
            ? "Reading the listing…"
            : a.job_status === "failed"
              ? "rookie couldn't read the job page (sites like LinkedIn and Workday often block it). Paste the job description below instead."
              : "Paste the job description below, or add a job link above, and rookie will score it for you."}
        </p>
      )}

      {!a.job_url && (
        <div className="mt-5 grid gap-2">
          <label htmlFor="job-link" className="label">
            {missing ? "Paste the job link and rookie fills in the missing details" : "Paste the job link"}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="job-link"
              type="text"
              inputMode="url"
              className="field min-w-0 flex-1 !text-[14px]"
              placeholder="https://… the job ad or application page"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && link.trim() && void readLink()}
            />
            <button type="button" className="btn" disabled={busy || !link.trim()} onClick={readLink}>
              {busy ? "Reading…" : "Read this link"}
            </button>
          </div>
          <p className="text-[12.5px] text-[var(--mute)]">Or paste the description below if the site blocks reading.</p>
        </div>
      )}

      <div className="mt-5 grid gap-2">
        <label htmlFor="job-text" className="label">
          {analysed ? "Wrong or incomplete? Paste the job description" : "Paste the job description"}
        </label>
        <textarea
          id="job-text"
          rows={5}
          className="field !text-[14px]"
          placeholder="Copy the whole job ad here: company, role, responsibilities, requirements, dates…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={busy || text.trim().length < 80} onClick={() => run(true)}>
            {busy ? "Analysing…" : "Analyse this description"}
          </button>
          {a.job_url && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(false)}>
              {analysed ? "Re-read the link" : "Read the link"}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
