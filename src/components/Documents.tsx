"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateDocs } from "@/lib/ai-client";
import { cvAsText, letterAsText, type CvContent, type Doc, type LetterContent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";

type Props = {
  applicationId: string;
  cv: Doc<CvContent>;
  letter: Doc<LetterContent>;
  hasCv: boolean;
  canGenerate: boolean;
  left: number;
  signature: string;
};

export default function Documents({ applicationId, cv: cvDoc, letter: letterDoc, hasCv, canGenerate, left, signature }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const has = !!(cvDoc && letterDoc);

  async function generate() {
    setBusy(true);
    setError(null);
    setConfirmRegen(false);
    try {
      await generateDocs(applicationId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write your documents.");
    } finally {
      setBusy(false);
    }
  }

  const edited = cvDoc?.edited || letterDoc?.edited;
  const button = (
    <button
      type="button"
      className="btn btn-lg"
      disabled={busy || !hasCv || !canGenerate || left <= 0}
      onClick={() => (has && edited && !confirmRegen ? setConfirmRegen(true) : generate())}
    >
      {busy ? "Writing… (about 20 seconds)" : has ? "Regenerate both" : "Write my CV and cover letter"}
    </button>
  );

  return (
    <section id="documents" className="mt-8 scroll-mt-4" aria-labelledby="docs-h">
      <h2 id="docs-h" className="sec">
        <small>[02]</small> Your tailored CV and cover letter
      </h2>

      <div className="card mt-3 flex flex-wrap items-center gap-4">
        {button}
        <p className="text-sm text-[var(--ink2)]">
          {!hasCv ? (
            <>
              Add your CV in <Link href="/profile">Profile</Link> first.
            </>
          ) : !canGenerate ? (
            "Rookie needs the job details first: analyse the role above."
          ) : (
            `${left} of 6 left today. Uses only facts from your CV and story.`
          )}
        </p>
        {confirmRegen && (
          <p className="w-full text-sm">
            This replaces your edits.{" "}
            <button type="button" className="font-semibold underline" onClick={generate}>
              Regenerate anyway
            </button>
          </p>
        )}
        {error && (
          <p role="alert" className="alert w-full">
            {error}
          </p>
        )}
      </div>

      {cvDoc && <CvEditor key={JSON.stringify(cvDoc.content)} id={applicationId} doc={cvDoc} />}
      {letterDoc && (
        <LetterEditor key={JSON.stringify(letterDoc.content)} id={applicationId} doc={letterDoc} signature={signature} />
      )}
    </section>
  );
}

async function saveDoc(applicationId: string, kind: "cv" | "cover_letter", content: object) {
  return createClient().from("documents").update({ content, edited: true }).eq("application_id", applicationId).eq("kind", kind);
}

function Notes({ meta }: { meta: Record<string, string[]> }) {
  const labels: Record<string, string> = {
    changes: "What changed",
    flags: "Please check",
    used_company_facts: "Company facts used",
    used_profile_facts: "Your facts used",
  };
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {Object.entries(labels).map(([k, label]) =>
        meta[k]?.length ? (
          <div key={k} className={`rounded-2xl p-4 ${k === "flags" ? "bg-[var(--warnbg)]" : "bg-[var(--card2)]"}`}>
            <p className="text-[13px] font-semibold">{label}</p>
            <ul className="dot-list mt-1 text-[13px] leading-snug text-[var(--ink2)]">
              {meta[k].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

function Toolbar({
  onSave,
  saving,
  dirty,
  printHref,
  copyText,
  msg,
}: {
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  printHref: string;
  copyText: string;
  msg: string | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" className="btn" disabled={!dirty || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save edits"}
      </button>
      <a href={printHref} target="_blank" rel="noopener" className="btn btn-ghost">
        Download PDF
      </a>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(copyText);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy text"}
      </button>
      {msg && (
        <span role="status" className="text-sm text-[var(--ink2)]">
          {msg}
        </span>
      )}
    </div>
  );
}

function CvEditor({ id, doc }: { id: string; doc: NonNullable<Doc<CvContent>> }) {
  const [cv, setCv] = useState(doc.content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const change = (next: CvContent) => {
    setCv(next);
    setDirty(true);
  };
  async function save() {
    setSaving(true);
    const { error } = await saveDoc(id, "cv", cv);
    setSaving(false);
    setMsg(error ? `Couldn't save: ${error.message}` : "Saved.");
    if (!error) setDirty(false);
  }

  return (
    <article className="card mt-4" aria-label="Tailored CV">
      <h3 className="text-lg font-semibold">Tailored CV</h3>
      <div className="mt-4 rounded-2xl border border-[var(--line)] p-5 font-serif">
        <p className="text-center text-[20px] font-bold uppercase tracking-wide">{cv.name}</p>
        <p className="text-center text-[13px] text-[var(--ink2)]">{cv.contact.join(" | ")}</p>
        <label className="mt-4 block text-[12px] font-bold uppercase tracking-wide" htmlFor="cv-summary">
          Summary
        </label>
        <textarea
          id="cv-summary"
          rows={3}
          className="field mt-1 !font-serif !text-[14px]"
          value={cv.summary}
          onChange={(e) => change({ ...cv, summary: e.target.value })}
        />
        {cv.sections.map((s, si) => (
          <div key={si} className="mt-4">
            <p className="border-b border-[var(--ink)] pb-0.5 text-[12px] font-bold uppercase tracking-wide">{s.heading}</p>
            {s.items.map((it, ii) => (
              <div key={ii} className="mt-2">
                <p className="flex flex-wrap justify-between gap-2 text-[14px]">
                  <span>
                    <strong>{it.title}</strong>
                    {it.subtitle && ` | ${it.subtitle}`}
                  </span>
                  <span className="text-[var(--ink2)]">{it.dates}</span>
                </p>
                <label className="sr-only" htmlFor={`b-${si}-${ii}`}>
                  Bullets for {it.title}, one per line
                </label>
                <textarea
                  id={`b-${si}-${ii}`}
                  rows={Math.max(2, it.bullets.length + 1)}
                  className="field mt-1 !font-serif !text-[13.5px]"
                  value={it.bullets.join("\n")}
                  onChange={(e) => {
                    const sections = structuredClone(cv.sections);
                    sections[si].items[ii].bullets = e.target.value.split("\n");
                    change({ ...cv, sections });
                  }}
                />
              </div>
            ))}
          </div>
        ))}
        {cv.skills.length > 0 && (
          <div className="mt-4 text-[14px]">
            {cv.skills.map((s) => (
              <p key={s.group}>
                <strong>{s.group}:</strong> {s.items}
              </p>
            ))}
          </div>
        )}
      </div>
      <Notes meta={doc.meta} />
      <Toolbar
        onSave={save}
        saving={saving}
        dirty={dirty}
        printHref={`/app/a/${id}/print/cv`}
        copyText={cvAsText(cv)}
        msg={msg}
      />
    </article>
  );
}

function LetterEditor({ id, doc, signature }: { id: string; doc: NonNullable<Doc<LetterContent>>; signature: string }) {
  const [l, setL] = useState(doc.content);
  const [body, setBody] = useState(doc.content.paragraphs.join("\n\n"));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const current = (): LetterContent => ({
    ...l,
    paragraphs: body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  });
  async function save() {
    setSaving(true);
    const { error } = await saveDoc(id, "cover_letter", current());
    setSaving(false);
    setMsg(error ? `Couldn't save: ${error.message}` : "Saved.");
    if (!error) setDirty(false);
  }
  const words = body.split(/\s+/).filter(Boolean).length;

  return (
    <article className="card mt-4" aria-label="Cover letter">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">Cover letter</h3>
        <span className={`text-sm ${words > 380 ? "text-[var(--bad)]" : "text-[var(--mute)]"}`}>{words} words</span>
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--line)] p-5 font-serif text-[14px]">
        <p className="font-bold">Re: {l.re}</p>
        <label className="sr-only" htmlFor="l-greeting">
          Greeting
        </label>
        <input
          id="l-greeting"
          className="field mt-3 !font-serif !text-[14px]"
          value={l.greeting}
          onChange={(e) => {
            setL({ ...l, greeting: e.target.value });
            setDirty(true);
          }}
        />
        <label className="sr-only" htmlFor="l-body">
          Letter body, blank line between paragraphs
        </label>
        <textarea
          id="l-body"
          rows={16}
          className="field mt-2 !font-serif !text-[14px] leading-relaxed"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setDirty(true);
          }}
        />
        <p className="mt-2">{l.closing}</p>
        <p>{signature}</p>
      </div>
      <Notes meta={doc.meta} />
      <Toolbar
        onSave={save}
        saving={saving}
        dirty={dirty}
        printHref={`/app/a/${id}/print/letter`}
        copyText={letterAsText(current(), signature)}
        msg={msg}
      />
    </article>
  );
}
