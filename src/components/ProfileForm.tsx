"use client";

import { useRef, useState } from "react";
import { ChipList, EntryList, LinkList, ProjectList } from "@/components/profile/Fields";
import { importCv } from "@/lib/ai-client";
import type { BarrierRule, Contact, ProfileData, StructuredProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

const MEMORY_PROMPT = `Write down everything you know about me that could help me apply for jobs and internships: my education, work and volunteering experience, projects, skills and tools, languages, achievements with numbers, what I'm good at, how I work, my interests and hobbies, my goals and the kind of roles and companies I want, and any constraints (location, visa, dates). Use short bullet points under clear headings. Only include facts you actually know about me; don't guess.`;

const CONTACT: [keyof Contact, string, string][] = [
  ["name", "Full name", "name"],
  ["email", "Email for applications", "email"],
  ["phone", "Phone", "tel"],
  ["city", "City", "address-level2"],
  ["linkedin", "LinkedIn or portfolio", "url"],
];

export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const [d, setD] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [storyDraft, setStoryDraft] = useState("");
  const [barrierDraft, setBarrierDraft] = useState<BarrierRule>({ text: "", kind: "deal_breaker" });
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<ProfileData>) => {
    setD((x) => ({ ...x, ...patch }));
    setDirty(true);
  };
  const updateProfile = (patch: Partial<StructuredProfile>) => update({ profile: { ...d.profile, ...patch } });

  async function save(next: ProfileData = d) {
    setSaving(true);
    setMsg(null);
    const { error } = await createClient()
      .from("profiles")
      .upsert(
        {
          cv_text: next.cv_text,
          profile: next.profile,
          story_points: next.story_points,
          memory: next.memory,
          barriers: next.barriers,
          writing_notes: next.writing_notes,
          contact: next.contact,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) return setMsg({ ok: false, text: `Couldn't save: ${error.message}` });
    setDirty(false);
    setMsg({ ok: true, text: "Saved. New scores and documents will use this." });
  }

  /** Story points and barriers save as soon as you add or remove one. */
  async function saveNow(patch: Partial<ProfileData>) {
    const next = { ...d, ...patch };
    setD(next);
    await save(next);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await importCv(file);
      const clean = (list?: { bullets?: string[] }[]) => (list ?? []).map((e) => ({ ...e, bullets: (e.bullets ?? []).filter(Boolean) }));
      update({
        cv_text: r.cv_text,
        contact: { ...d.contact, ...Object.fromEntries(Object.entries(r.contact ?? {}).filter(([, v]) => v)) },
        profile: {
          ...d.profile,
          ...r.profile,
          experience: clean(r.profile.experience) as StructuredProfile["experience"],
          education: clean(r.profile.education) as StructuredProfile["education"],
          volunteering: clean(r.profile.volunteering) as StructuredProfile["volunteering"],
        },
      });
      setImportMsg("Done. Check everything below, fix anything that's off, then press Save profile.");
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Couldn't read your CV.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const p = d.profile;

  return (
    <div className="grid gap-[var(--gap)] pb-24">
      <div className="puzzle">
        {/* Upload */}
        <section className="tile tile-lilac span-7" aria-labelledby="upload-h">
          <span className="chip-tag !bg-white">Start here</span>
          <h2 id="upload-h" className="mt-4 text-[26px] leading-tight tracking-tight">
            Upload your CV <span className="font-light">and Rookie fills in your profile.</span>
          </h2>
          <p className="mt-2 max-w-[460px] text-[14px] text-[var(--ink2)]">
            PDF, up to 5 MB. Your file isn&apos;t stored: Rookie reads it once, you check the result, then save. Or fill in
            everything below yourself.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className={`btn ${importing ? "pointer-events-none opacity-50" : ""}`}>
              {importing ? "Reading your CV…" : "Choose PDF"}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            {importing && <span className="spin" aria-hidden="true" />}
          </div>
          {importMsg && (
            <p role="status" className="mt-3 rounded-2xl bg-white px-4 py-2.5 text-[14px]">
              {importMsg}
            </p>
          )}
        </section>

        {/* Memory import */}
        <section className="tile tile-mint span-5" aria-labelledby="memory-h">
          <span className="chip-tag !bg-white">AI memory</span>
          <h2 id="memory-h" className="mt-4 text-[22px] leading-tight tracking-tight">
            Already use ChatGPT, Claude or Gemini?
          </h2>
          <p className="mt-2 text-[14px] text-[var(--ink2)]">
            Ask it what it knows about you and paste the answer here. Rookie uses it as extra background, never as
            instructions.
          </p>
          <button
            type="button"
            className="pill mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(MEMORY_PROMPT);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "✓ Prompt copied" : "Copy the prompt"}
          </button>
          <label htmlFor="memory" className="sr-only">
            Paste your AI memory export
          </label>
          <textarea
            id="memory"
            rows={5}
            className="field mt-3 !text-[14px]"
            placeholder="Paste the answer here…"
            value={d.memory}
            onChange={(e) => update({ memory: e.target.value })}
          />
        </section>

        {/* Structured profile */}
        <section className="tile span-12 grid gap-8" aria-labelledby="profile-h">
          <div>
            <h2 id="profile-h" className="text-[26px] tracking-tight">
              Your profile <span className="font-light">: everything you could use in an application.</span>
            </h2>
            <p className="mt-1 text-[14px] text-[var(--ink2)]">Rookie only ever uses facts from here, never anything made up.</p>
          </div>
          <EntryList label="Work experience" orgLabel="Company" roleLabel="Role" items={p.experience} onChange={(v) => updateProfile({ experience: v })} />
          <EntryList label="Education" orgLabel="School or university" roleLabel="Degree" items={p.education} onChange={(v) => updateProfile({ education: v })} />
          <EntryList
            label="Volunteering"
            orgLabel="Organisation"
            roleLabel="Role"
            items={p.volunteering}
            onChange={(v) => updateProfile({ volunteering: v })}
          />
          <ProjectList items={p.projects} onChange={(v) => updateProfile({ projects: v })} />
          <div className="grid gap-6 md:grid-cols-2">
            <ChipList label="Skills" hint="Tools, methods, programming languages." items={p.skills} onChange={(v) => updateProfile({ skills: v })} tone="bg-[var(--lilac)]" />
            <ChipList label="Languages" hint="e.g. German (Native), Spanish (B1)" items={p.languages} onChange={(v) => updateProfile({ languages: v })} tone="bg-[var(--sky)]" />
            <ChipList label="Hobbies" items={p.hobbies} onChange={(v) => updateProfile({ hobbies: v })} tone="bg-[var(--mint)]" />
            <ChipList label="Interests" items={p.interests} onChange={(v) => updateProfile({ interests: v })} tone="bg-[var(--butter)]" />
            <ChipList label="Fun facts" hint="Good conversation starters for interviews." items={p.fun_facts} onChange={(v) => updateProfile({ fun_facts: v })} tone="bg-[var(--peach)]" />
            <div>
              <label htmlFor="outside" className="text-[15px] font-bold">
                Outside work
              </label>
              <p className="text-[13px] text-[var(--ink2)]">Sport, art, clubs, side projects, caring for family…</p>
              <textarea id="outside" rows={4} className="field mt-2 !text-[14px]" value={p.outside_work} onChange={(e) => updateProfile({ outside_work: e.target.value })} />
            </div>
          </div>
          <LinkList items={p.links} onChange={(v) => updateProfile({ links: v })} />
        </section>

        {/* Story points */}
        <section className="tile tile-peach span-5" aria-labelledby="story-h">
          <span className="chip-tag !bg-white">Your story</span>
          <h2 id="story-h" className="mt-4 text-[22px] leading-tight tracking-tight">
            What your CV can&apos;t say.
          </h2>
          <p className="mt-1 text-[14px] text-[var(--ink2)]">
            One fact per point: why you chose your path, a moment you&apos;re proud of, what you want next. Your cover letters
            open with these.
          </p>
          <ul className="mt-4 grid gap-2">
            {d.story_points.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-2xl bg-white px-4 py-2.5 text-[14px]">
                <span>{s}</span>
                <button
                  type="button"
                  aria-label="Remove this point"
                  className="flex-none px-1"
                  onClick={() => saveNow({ story_points: d.story_points.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (storyDraft.trim()) {
                saveNow({ story_points: [...d.story_points, storyDraft.trim()] });
                setStoryDraft("");
              }
            }}
          >
            <label htmlFor="story-new" className="sr-only">
              New story point
            </label>
            <textarea
              id="story-new"
              rows={2}
              className="field !text-[14px]"
              placeholder="e.g. I switched from design to computer science two weeks into university."
              value={storyDraft}
              onChange={(e) => setStoryDraft(e.target.value)}
            />
            <button type="submit" className="btn justify-self-start !py-2" disabled={!storyDraft.trim() || saving}>
              + Add point
            </button>
          </form>
        </section>

        {/* Barriers */}
        <section className="tile tile-sky span-7" aria-labelledby="barriers-h">
          <span className="chip-tag !bg-white">Your barriers</span>
          <h2 id="barriers-h" className="mt-4 text-[22px] leading-tight tracking-tight">
            What would stop you from taking a role?
          </h2>
          <p className="mt-1 text-[14px] text-[var(--ink2)]">
            Rookie checks every role against these. Anything that clashes goes to <b>Barriers</b> for you to review: a{" "}
            <b>deal-breaker</b> is a hard no (like a visa you can&apos;t get), a <b>concern</b> is worth a second look (like a
            long commute). You always decide: move it back to your board, or rule it out.
          </p>
          <ul className="mt-4 grid gap-2">
            {d.barriers.map((b, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-2xl bg-white px-4 py-2.5 text-[14px]">
                <span className="grid justify-items-start gap-1.5">
                  <span className={`chip ${b.kind === "deal_breaker" ? "chip-bad" : "chip-warn"}`}>
                    {b.kind === "deal_breaker" ? "Deal-breaker" : "Concern"}
                  </span>
                  <span>{b.text}</span>
                </span>
                <button
                  type="button"
                  aria-label="Remove this barrier"
                  className="flex-none px-1"
                  onClick={() => saveNow({ barriers: d.barriers.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (barrierDraft.text.trim()) {
                saveNow({ barriers: [...d.barriers, { ...barrierDraft, text: barrierDraft.text.trim() }] });
                setBarrierDraft({ ...barrierDraft, text: "" });
              }
            }}
          >
            <label htmlFor="barrier-new" className="sr-only">
              New barrier
            </label>
            <input
              id="barrier-new"
              className="field !py-2 !text-[14px]"
              placeholder="e.g. I need EU work rights; no full-time before June 2027"
              value={barrierDraft.text}
              onChange={(e) => setBarrierDraft({ ...barrierDraft, text: e.target.value })}
            />
            <label className="sr-only" htmlFor="barrier-kind">
              Type
            </label>
            <select
              id="barrier-kind"
              className="field !py-2 !text-[14px]"
              value={barrierDraft.kind}
              onChange={(e) => setBarrierDraft({ ...barrierDraft, kind: e.target.value as BarrierRule["kind"] })}
            >
              <option value="deal_breaker">Deal-breaker</option>
              <option value="concern">Concern</option>
            </select>
            <button type="submit" className="btn justify-self-start !py-2" disabled={!barrierDraft.text.trim() || saving}>
              + Add barrier
            </button>
          </form>
        </section>

        {/* Header details and notes */}
        <section className="tile span-12" aria-labelledby="contact-h">
          <h2 id="contact-h" className="text-[18px]">
            CV and letter header <span className="font-light">and writing notes</span>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTACT.map(([k, label, ac]) => (
              <div key={k}>
                <label htmlFor={`c-${k}`} className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
                  {label}
                </label>
                <input
                  id={`c-${k}`}
                  className="field !py-2 !text-[14px]"
                  autoComplete={ac}
                  value={d.contact[k] ?? ""}
                  onChange={(e) => update({ contact: { ...d.contact, [k]: e.target.value } })}
                />
              </div>
            ))}
          </div>
          <label htmlFor="writing_notes" className="mt-4 mb-1 block text-[12px] font-bold text-[var(--ink2)]">
            Always or never say (optional)
          </label>
          <textarea
            id="writing_notes"
            rows={2}
            className="field !text-[14px]"
            placeholder="e.g. Never call my Spanish 'basic'. Don't mention my old job at X."
            value={d.writing_notes}
            onChange={(e) => update({ writing_notes: e.target.value })}
          />
          <details className="mt-4">
            <summary className="cursor-pointer text-[13px] font-bold">CV as plain text (from your upload, editable)</summary>
            <label htmlFor="cv_text" className="sr-only">
              CV text
            </label>
            <textarea id="cv_text" rows={10} className="field mt-2 font-mono !text-[12.5px]" value={d.cv_text} onChange={(e) => update({ cv_text: e.target.value })} />
          </details>
        </section>
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-4 z-20 px-4">
        <div className="mx-auto flex max-w-[680px] flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-[18px] bg-[var(--black)] px-5 py-3.5 text-white shadow-xl max-sm:flex-col max-sm:items-stretch">
          <span role={msg && !msg.ok ? "alert" : "status"} className="min-w-0 flex-1 text-[13px] leading-snug">
            {msg ? msg.text : dirty ? "You have unsaved changes." : "Private to you. Sent to Google Gemini only to score roles and write documents."}
          </span>
          <button type="button" className="pillbtn pillbtn-mint justify-center max-sm:w-full" disabled={saving} onClick={() => save()}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
