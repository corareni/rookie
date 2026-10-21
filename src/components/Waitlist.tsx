"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type WaitlistEntry = { plan: Choice; wants: string[]; note: string | null; created_at: string };
type Choice = "premium" | "basic" | "unsure";

const CHOICES: { v: Choice; label: string }[] = [
  { v: "premium", label: "Premium · €19.99 a month" },
  { v: "basic", label: "Basic · €9.99 a month" },
  { v: "unsure", label: "Not sure yet" },
];

// Stored as these keys, so the totals stay comparable if the labels change.
const WANTS: { v: string; label: string }[] = [
  { v: "roles", label: "More role scores" },
  { v: "cvs", label: "More CVs and cover letters" },
  { v: "email", label: "Email updates" },
  { v: "deep", label: "Deep answers from rookie" },
  { v: "interview", label: "Interview prep" },
  { v: "season", label: "A season pass" },
];

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

/** Profile tile: join the waiting list for the paid plans. Lets us see who's interested before billing exists. */
export default function Waitlist({ initial, ready }: { initial: WaitlistEntry | null; ready: boolean }) {
  const [entry, setEntry] = useState(initial);
  const [plan, setPlan] = useState<Choice>(initial?.plan ?? "premium");
  const [wants, setWants] = useState<string[]>(initial?.wants ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (v: string) => setWants((w) => (w.includes(v) ? w.filter((x) => x !== v) : [...w, v]));

  async function join() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return setMsg({ ok: false, text: "Log in again to join the list." });
    }
    const { data, error } = await supabase
      .from("waitlist")
      .upsert({ user_id: user.id, plan, wants, note: note.trim() || null }, { onConflict: "user_id" })
      .select("plan,wants,note,created_at")
      .single();
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `Couldn't save: ${error.message}` });
    setMsg({ ok: true, text: entry ? "Saved your changes." : "You're on the list. Thank you!" });
    setEntry(data as WaitlistEntry);
  }

  async function leave() {
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().from("waitlist").delete().not("user_id", "is", null);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `Couldn't leave the list: ${error.message}` });
    setEntry(null);
    setMsg({ ok: true, text: "You've left the waiting list." });
  }

  return (
    <section id="waitlist" className="tile tile-peach mt-[var(--gap)] grid scroll-mt-20 gap-5" aria-labelledby="waitlist-h">
      <div className="max-w-[680px]">
        <h2 id="waitlist-h" className="text-[18px]">
          <b>Waiting list</b> <span className="font-light">: Basic and Premium</span>
        </h2>
        <p className="mt-1 text-[14px] text-[var(--ink2)]">
          Paid plans aren&apos;t open yet. Join the list and tell us what you&apos;d use most, and we&apos;ll let you know when
          they open. Joining is free and doesn&apos;t sign you up for anything.
        </p>
      </div>

      {!ready ? (
        <p className="text-[14px] font-bold">The waiting list opens soon.</p>
      ) : (
        <>
          {entry && (
            <p className="rounded-2xl bg-white px-4 py-3 text-[14px]">
              <b>You&apos;re on the list</b> for {CHOICES.find((c) => c.v === entry.plan)?.label.split(" ·")[0] ?? "a paid plan"}{" "}
              since {when(entry.created_at)}.
            </p>
          )}

          <fieldset className="grid gap-2">
            <legend className="label">Which plan would you want?</legend>
            <div className="flex flex-wrap gap-2">
              {CHOICES.map((c) => (
                <button key={c.v} type="button" className="pill" aria-pressed={plan === c.v} onClick={() => setPlan(c.v)}>
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="label">What would you use most? Pick any.</legend>
            <div className="flex flex-wrap gap-2">
              {WANTS.map((w) => (
                <button key={w.v} type="button" className="pill" aria-pressed={wants.includes(w.v)} onClick={() => toggle(w.v)}>
                  {w.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <label htmlFor="waitlist-note" className="label">
              Anything else you&apos;d want? (optional)
            </label>
            <textarea
              id="waitlist-note"
              rows={2}
              maxLength={500}
              className="field !text-[14px]"
              placeholder="For example: a cheaper student price, more interview practice, LinkedIn import…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn" disabled={busy} onClick={join}>
              {busy ? "Saving…" : entry ? "Save changes" : "Join the waiting list"}
            </button>
            {entry && (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={leave}>
                Leave the list
              </button>
            )}
            {msg && (
              <span role="status" className={`text-[14px] ${msg.ok ? "font-bold" : "text-[var(--bad)]"}`}>
                {msg.text}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
