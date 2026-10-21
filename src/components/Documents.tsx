"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import WritingAnimation from "@/components/WritingAnimation";
import { generateDocs, type GenerateOptions } from "@/lib/ai-client";
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
  /** Every fact in the user's profile, so they can pick what to feature. */
  facts: string[];
};

const STYLES: { v: GenerateOptions["style"]; label: string; hint: string }[] = [
  { v: "concise", label: "To the point", hint: "Short, factual, no warm-up" },
  { v: "story", label: "Storytelling", hint: "Opens with a real moment" },
  { v: "elaborate", label: "Elaborate", hint: "Fuller, more descriptive" },
];
const WHICH: { v: GenerateOptions["which"]; label: string }[] = [
  { v: "both", label: "CV + cover letter" },
  { v: "cv", label: "CV only" },
  { v: "letter", label: "Cover letter only" },
];
const LENGTHS: { v: GenerateOptions["length"]; label: string }[] = [
  { v: "short", label: "Short · ~200 words" },
  { v: "standard", label: "Standard · ~300" },
  { v: "long", label: "Long · ~400" },
];

export default function Documents({ applicationId, cv: cvDoc, letter: letterDoc, hasCv, canGenerate, left, signature, facts }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [style, setStyle] = useState<GenerateOptions["style"]>("story");
  const [length, setLength] = useState<GenerateOptions["length"]>("standard");
  const [picked, setPicked] = useState<string[]>([]);
  const [which, setWhich] = useState<GenerateOptions["which"]>("both");
  const has = !!(cvDoc && letterDoc);

  async function generate() {
    setBusy(true);
    setError(null);
    setConfirmRegen(false);
    try {
      await generateDocs(applicationId, { style, length, facts: picked, which });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write your documents.");
    } finally {
      setBusy(false);
    }
  }

  // Only warn about edits in the documents this run will replace.
  const edited = (which !== "letter" && cvDoc?.edited) || (which !== "cv" && letterDoc?.edited);
  const target = which === "cv" ? "CV" : which === "letter" ? "cover letter" : "CV and cover letter";
  const exists = which === "cv" ? !!cvDoc : which === "letter" ? !!letterDoc : has;
  const button = (
    <button
      type="button"
      className="btn btn-lg"
      disabled={busy || !hasCv || !canGenerate || left <= 0}
      onClick={() => (exists && edited && !confirmRegen ? setConfirmRegen(true) : generate())}
    >
      {busy ? "Writing…" : `${exists ? "Regenerate" : "Write"} my ${target}`}
    </button>
  );

  return (
    <section id="documents" className="mt-8 scroll-mt-4" aria-labelledby="docs-h">
      <h2 id="docs-h" className="sec">
        <small>[02]</small> Your tailored CV and cover letter
      </h2>

      <div className="card mt-3 grid gap-5">
        <fieldset>
          <legend className="label">What should Rookie write?</legend>
          <div className="mt-1 inline-grid grid-cols-3 gap-1 rounded-[14px] bg-white p-1 max-sm:grid-cols-1">
            {WHICH.map((o) => (
              <button key={o.v} type="button" className="act !bg-transparent aria-pressed:!bg-[var(--lilac)]" aria-pressed={which === o.v} onClick={() => setWhich(o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        {which !== "cv" && (
        <>
        <fieldset>
          <legend className="label">Cover letter style</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {STYLES.map((o) => (
              <button key={o.v} type="button" className="act !h-auto !justify-start !py-2.5 !text-left" aria-pressed={style === o.v} onClick={() => setStyle(o.v)}>
                <span>
                  <span className="block">{o.label}</span>
                  <span className="block text-[12px] font-light text-[var(--ink2)]">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Length</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {LENGTHS.map((o) => (
              <button key={o.v} type="button" className="act" aria-pressed={length === o.v} onClick={() => setLength(o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        </>
        )}
        {facts.length > 0 && (
          <details className="rounded-2xl bg-white p-4">
            <summary className="cursor-pointer text-[14px] font-bold">
              Choose what to include <span className="font-light text-[var(--ink2)]">(optional: otherwise Rookie picks the best facts)</span>
              {picked.length > 0 && <span className="chip chip-good ml-2">{picked.length} picked</span>}
            </summary>
            <ul className="mt-3 grid max-h-[320px] gap-1.5 overflow-y-auto pr-1">
              {facts.map((f) => (
                <li key={f}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-1.5 text-[13.5px] hover:bg-[var(--tile)]">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 flex-none accent-[var(--ink)]"
                      checked={picked.includes(f)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, f] : p.filter((x) => x !== f)))}
                    />
                    <span>{f}</span>
                  </label>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="flex flex-wrap items-center gap-4">
        {button}
        <p className="text-sm text-[var(--ink2)]">
          {!hasCv ? (
            <>
              Add your CV in <Link href="/profile">Profile</Link> first.
            </>
          ) : !canGenerate ? (
            "Rookie needs the job details first: analyse the role above."
          ) : (
            `${left} of 6 left today. Only facts from your profile, and the CV always fits one page.`
          )}
        </p>
        {confirmRegen && (
          <p className="w-full text-sm">
            This replaces your edits to the {target}.{" "}
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
        {busy && <WritingAnimation />}
      </div>

      {cvDoc &&
        (cvDoc.content?.header ? (
          <CvEditor key={JSON.stringify(cvDoc.content)} id={applicationId} doc={cvDoc} />
        ) : (
          <p className="card mt-4 text-[14px]">This CV was made with an older version of Rookie. Press Regenerate to get the new layout.</p>
        ))}
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
  fileBase,
  copyText,
  msg,
}: {
  onSave: () => Promise<boolean>;
  saving: boolean;
  dirty: boolean;
  fileBase: string;
  copyText: string;
  msg: string | null;
}) {
  const [copied, setCopied] = useState(false);
  // Files are built from the saved version, so save edits first.
  const download = async (ext: "pdf" | "docx") => {
    if (dirty && !(await onSave())) return;
    window.location.href = `${fileBase}.${ext}`;
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" className="btn" disabled={!dirty || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save edits"}
      </button>
      <button type="button" className="btn btn-mint" onClick={() => download("pdf")}>
        ↓ PDF
      </button>
      <button type="button" className="btn btn-lilac" onClick={() => download("docx")}>
        ↓ Word
      </button>
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
    return !error;
  }

  return (
    <article className="card mt-4" aria-label="Tailored CV">
      <h3 className="text-lg font-semibold">Tailored CV</h3>
      <div className="mt-4 rounded-2xl bg-white p-5 font-serif">
        <p className="text-center text-[20px] font-bold uppercase tracking-wide">{cv.header.name}</p>
        <p className="text-center text-[13px] text-[var(--ink2)]">{cv.header.contact.join(" | ")}</p>
        {cv.header.note && <p className="text-center text-[13px] italic text-[var(--ink2)]">{cv.header.note}</p>}
        <label className="mt-4 block border-b border-[var(--ink)] pb-0.5 text-[12px] font-bold uppercase tracking-wide" htmlFor="cv-summary">
          Summary
        </label>
        <textarea
          id="cv-summary"
          rows={3}
          className="field mt-2 !font-serif !text-[14px]"
          value={cv.summary}
          onChange={(e) => change({ ...cv, summary: e.target.value })}
        />
        {cv.sections.map((s, si) => (
          <div key={si} className="mt-4">
            <p className="border-b border-[var(--ink)] pb-0.5 text-[12px] font-bold uppercase tracking-wide">{s.heading}</p>
            {s.kind === "entries"
              ? s.entries.map((e, ei) => (
                  <div key={ei} className="mt-2">
                    <p className="flex flex-wrap justify-between gap-2 text-[14px]">
                      <span>
                        <b className="uppercase">{e.org}</b>
                        {e.org_note && <i> - {e.org_note}</i>}
                      </span>
                      <b>{e.location}</b>
                    </p>
                    <p className="flex flex-wrap justify-between gap-2 text-[14px]">
                      <span>
                        <b>{e.role}</b>
                        {e.role_note && <i> ({e.role_note})</i>}
                      </span>
                      <b>{e.dates}</b>
                    </p>
                    <label className="sr-only" htmlFor={`b-${si}-${ei}`}>
                      Bullets for {e.org}, one per line
                    </label>
                    <textarea
                      id={`b-${si}-${ei}`}
                      rows={Math.max(2, e.bullets.length + 1)}
                      className="field mt-1 !font-serif !text-[13.5px]"
                      value={e.bullets.join("\n")}
                      onChange={(ev) => {
                        const sections = structuredClone(cv.sections);
                        sections[si].entries[ei].bullets = ev.target.value.split("\n");
                        change({ ...cv, sections });
                      }}
                    />
                  </div>
                ))
              : s.lines.map((l, li) => (
                  <div key={li} className="mt-2 grid gap-1 sm:grid-cols-[160px_1fr] sm:items-start">
                    <b className="pt-2 text-[13.5px]">{l.label}:</b>
                    <label className="sr-only" htmlFor={`l-${si}-${li}`}>
                      {l.label}
                    </label>
                    <textarea
                      id={`l-${si}-${li}`}
                      rows={2}
                      className="field !font-serif !text-[13.5px]"
                      value={l.text}
                      onChange={(ev) => {
                        const sections = structuredClone(cv.sections);
                        sections[si].lines[li].text = ev.target.value;
                        change({ ...cv, sections });
                      }}
                    />
                  </div>
                ))}
          </div>
        ))}
      </div>
      <Notes meta={doc.meta} />
      <Toolbar
        onSave={save}
        saving={saving}
        dirty={dirty}
        fileBase={`/api/documents/${id}/cv`}
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
    return !error;
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
        fileBase={`/api/documents/${id}/letter`}
        copyText={letterAsText(current(), signature)}
        msg={msg}
      />
    </article>
  );
}
