"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
  cv_text: string;
  story: string;
  rules: string;
  writing_notes: string;
  contact: { name?: string; email?: string; phone?: string; city?: string; linkedin?: string };
};

const CONTACT: [keyof ProfileData["contact"], string, string][] = [
  ["name", "Full name", "name"],
  ["email", "Email for applications", "email"],
  ["phone", "Phone", "tel"],
  ["city", "City", "address-level2"],
  ["linkedin", "LinkedIn or portfolio", "url"],
];

export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const text = (k: "cv_text" | "story" | "rules" | "writing_notes") => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setP((x) => ({ ...x, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await createClient().from("profiles").upsert(p, { onConflict: "user_id" });
    setSaving(false);
    setMsg(error ? { ok: false, text: `Couldn't save: ${error.message}` } : { ok: true, text: "Saved. New analyses and documents will use this." });
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <section className="card grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">Your CV</h2>
          <p className="text-sm text-[var(--ink2)]">
            Paste the text of your CV (open your PDF, select all, copy). Rookie only ever uses facts from here.
          </p>
        </div>
        <label className="sr-only" htmlFor="cv_text">
          CV text
        </label>
        <textarea id="cv_text" rows={14} className="field font-mono !text-[13px]" value={p.cv_text} onChange={text("cv_text")} />
      </section>

      <section className="card grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">Your story</h2>
          <p className="text-sm text-[var(--ink2)]">
            What your CV can&apos;t say: why you study what you study, projects you&apos;re proud of, places you&apos;ve lived,
            what you want next. Write like you talk. Your cover letters open with this.
          </p>
        </div>
        <label className="sr-only" htmlFor="story">
          Your story
        </label>
        <textarea id="story" rows={7} className="field" value={p.story} onChange={text("story")} />
      </section>

      <section className="card grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">Your hard rules</h2>
          <p className="text-sm text-[var(--ink2)]">
            Roles that break these go to Ruled out; unclear ones go to Barriers. For example: &quot;No more than 3 months on
            site. No full-time before June 2027. I have EU work rights only. Graduating 2029.&quot;
          </p>
        </div>
        <label className="sr-only" htmlFor="rules">
          Hard rules
        </label>
        <textarea id="rules" rows={4} className="field" value={p.rules} onChange={text("rules")} />
      </section>

      <section className="card grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">Letter header and writing notes</h2>
          <p className="text-sm text-[var(--ink2)]">Used at the top of your CV and cover letters.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACT.map(([k, label, ac]) => (
            <div key={k}>
              <label htmlFor={`c-${k}`} className="label">
                {label}
              </label>
              <input
                id={`c-${k}`}
                className="field"
                autoComplete={ac}
                value={p.contact[k] ?? ""}
                onChange={(e) => setP((x) => ({ ...x, contact: { ...x.contact, [k]: e.target.value } }))}
              />
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="writing_notes" className="label">
            Always or never say (optional)
          </label>
          <textarea
            id="writing_notes"
            rows={3}
            className="field"
            placeholder="e.g. Never call my Spanish 'basic'. Say I built my projects with AI as a pair programmer."
            value={p.writing_notes}
            onChange={text("writing_notes")}
          />
        </div>
      </section>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "chip chip-good !px-4 !py-2" : "alert"}>
          {msg.text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-lg" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        <p className="text-xs text-[var(--mute)]">
          Private to you. To score roles and write documents it&apos;s sent to Google Gemini, which doesn&apos;t use it to
          train models for users in the EU.
        </p>
      </div>
    </form>
  );
}
