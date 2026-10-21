"use client";

import Link from "next/link";
import { useState } from "react";
import { COLUMNS, STATUSES, deadlineText, isUrl, titleCase, type Application, type Status } from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";

type Form = {
  status: Status;
  deadline: string;
  submitted_on: string;
  assessment_on: string;
  interview_on: string;
  offer_on: string;
  company: string;
  role: string;
  location: string;
  job_url: string;
};

const toForm = (a: Application): Form => ({
  status: a.status,
  deadline: a.deadline ?? "",
  submitted_on: a.submitted_on ?? "",
  assessment_on: a.assessment_on ?? "",
  interview_on: a.interview_on ?? "",
  offer_on: a.offer_on ?? "",
  company: a.company ?? "",
  role: a.role ?? "",
  location: a.location ?? "",
  job_url: a.job_url ?? "",
});

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

export default function ApplicationEditor({ initial, children }: { initial: Application; children?: React.ReactNode }) {
  const [app, setApp] = useState(initial);
  const [form, setForm] = useState<Form>(toForm(initial));
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.job_url.trim() && !isUrl(form.job_url.trim())) {
      setMsg({ kind: "err", text: "The job link must start with http:// or https://" });
      return;
    }
    setSaving(true);
    setMsg(null);
    const { data, error } = await createClient()
      .from("applications")
      .update({
        status: form.status,
        deadline: orNull(form.deadline),
        submitted_on: orNull(form.submitted_on),
        assessment_on: orNull(form.assessment_on),
        interview_on: orNull(form.interview_on),
        offer_on: orNull(form.offer_on),
        company: orNull(form.company),
        role: orNull(form.role),
        location: orNull(form.location),
        job_url: orNull(form.job_url),
      })
      .eq("id", app.id)
      .select(COLUMNS)
      .single();
    setSaving(false);
    if (error) {
      setMsg({ kind: "err", text: `Couldn't save: ${error.message}` });
      return;
    }
    setApp(data as unknown as Application);
    setForm(toForm(data as unknown as Application));
    setMsg({ kind: "ok", text: "Saved." });
  }

  async function remove() {
    const { error } = await createClient().from("applications").delete().eq("id", app.id);
    if (error) {
      setMsg({ kind: "err", text: `Couldn't delete: ${error.message}` });
      return;
    }
    window.location.assign("/app");
  }

  const analysed = !!(app.role && app.company);

  return (
    <main className="mx-auto max-w-[860px] pb-16">
      <Link href="/app" className="text-sm font-semibold">
        ← Board
      </Link>
      <h1 className="mt-3 text-[clamp(26px,5vw,40px)] leading-tight tracking-[-0.03em] break-anywhere">
        {analysed ? (
          <>
            {app.company} <span className="font-light">{titleCase(app.role)}</span>
          </>
        ) : (
          app.title
        )}
      </h1>
      {analysed && <p className="mt-1 text-sm text-[var(--mute)] break-anywhere">{app.title}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {app.deadline && <span className="chip chip-mute">{deadlineText(app.deadline)}</span>}
        {app.job_url && (
          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="font-semibold">
            Open job ad ↗
          </a>
        )}
      </div>

      {children}

      <h2 className="sec mt-8">
        <small>[03]</small> Tracking details
      </h2>
      <form onSubmit={save} className="card mt-3 grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" id="status">
            <select id="status" className="field" value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline" id="deadline">
            <input id="deadline" type="date" className="field" value={form.deadline} onChange={set("deadline")} />
          </Field>
          <Field label="Company" id="company">
            <input id="company" className="field" value={form.company} onChange={set("company")} />
          </Field>
          <Field label="Role" id="role">
            <input id="role" className="field" value={form.role} onChange={set("role")} />
          </Field>
          <Field label="Location" id="location">
            <input id="location" className="field" value={form.location} onChange={set("location")} />
          </Field>
          <Field label="Job link" id="job_url">
            <input id="job_url" type="text" inputMode="url" className="field" value={form.job_url} onChange={set("job_url")} />
          </Field>
        </div>

        <fieldset>
          <legend className="label">Dates (filled in automatically when the status changes)</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Submitted" id="submitted_on" small>
              <input id="submitted_on" type="date" className="field" value={form.submitted_on} onChange={set("submitted_on")} />
            </Field>
            <Field label="Assessment" id="assessment_on" small>
              <input id="assessment_on" type="date" className="field" value={form.assessment_on} onChange={set("assessment_on")} />
            </Field>
            <Field label="Interview" id="interview_on" small>
              <input id="interview_on" type="date" className="field" value={form.interview_on} onChange={set("interview_on")} />
            </Field>
            <Field label="Offer" id="offer_on" small>
              <input id="offer_on" type="date" className="field" value={form.offer_on} onChange={set("offer_on")} />
            </Field>
          </div>
        </fieldset>



        {msg && (
          <p role={msg.kind === "err" ? "alert" : "status"} className={msg.kind === "err" ? "alert" : "chip chip-good !py-2 !px-4"}>
            {msg.text}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="submit" className="btn btn-lg" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Delete this application?
              <button type="button" className="btn btn-danger !py-2" onClick={remove}>
                Yes, delete
              </button>
              <button type="button" className="btn btn-ghost !py-2" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="text-sm font-semibold text-[var(--bad)]" onClick={() => setConfirmDelete(true)}>
              Delete application
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function Field({ label, id, small, children }: { label: string; id: string; small?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={small ? "mb-1 block text-xs font-medium text-[var(--ink2)]" : "label"}>
        {label}
      </label>
      {children}
    </div>
  );
}
