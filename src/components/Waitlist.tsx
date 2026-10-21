"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CloseIcon from "@/components/CloseIcon";
import { createClient } from "@/lib/supabase/client";

export type WaitlistEntry = { plan: Choice; wants: string[]; note: string | null; created_at: string };
type Choice = "premium" | "basic" | "unsure";

const CHOICES: { v: Choice; name: string; price: string; line: string }[] = [
  { v: "premium", name: "Premium", price: "€19.99 a month", line: "100 roles, 30 CVs, email updates" },
  { v: "basic", name: "Basic", price: "€9.99 a month", line: "40 roles, 12 CVs, interview prep" },
  { v: "unsure", name: "Not sure yet", price: "Tell us later", line: "Just keep me posted" },
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

/** Fired after joining, changing or leaving, so the Profile box and the pop-up stay in step. */
const CHANGED = "rk:waitlist-changed";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Join the waiting list for the paid plans: on the Profile page, and in the pop-up from the header.
 * Lets us see who's interested before billing exists.
 */
export default function Waitlist({
  initial,
  ready,
  signedIn = true,
  variant = "page",
  onClose,
}: {
  initial: WaitlistEntry | null;
  ready: boolean;
  signedIn?: boolean;
  variant?: "page" | "dialog";
  onClose?: () => void;
}) {
  const [entry, setEntry] = useState(initial);
  const [plan, setPlan] = useState<Choice>(initial?.plan ?? "premium");
  const [wants, setWants] = useState<string[]>(initial?.wants ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const sync = (e: Event) => {
      const next = (e as CustomEvent<WaitlistEntry | null>).detail;
      setEntry(next);
      if (next) {
        setPlan(next.plan);
        setWants(next.wants);
        setNote(next.note ?? "");
      }
    };
    window.addEventListener(CHANGED, sync);
    return () => window.removeEventListener(CHANGED, sync);
  }, []);

  const toggle = (v: string) => setWants((w) => (w.includes(v) ? w.filter((x) => x !== v) : [...w, v]));
  const announce = (e: WaitlistEntry | null) => window.dispatchEvent(new CustomEvent(CHANGED, { detail: e }));

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
    announce(data as WaitlistEntry);
  }

  async function leave() {
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().from("waitlist").delete().not("user_id", "is", null);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `Couldn't leave the list: ${error.message}` });
    setMsg({ ok: true, text: "You've left the waiting list." });
    announce(null);
  }

  const Root = variant === "page" ? "section" : "div";
  return (
    <Root
      id={variant === "page" ? "waitlist" : undefined}
      className={`waitlist ${variant === "page" ? "tile tile-mint mt-[var(--gap)] scroll-mt-20" : "p-6 sm:p-9"} grid gap-6`}
      aria-labelledby={`waitlist-h-${variant}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[640px]">
          <span className="chip bg-white text-[var(--ink)]">Coming soon</span>
          <h2 id={`waitlist-h-${variant}`} className="mt-3 text-[clamp(30px,4vw,44px)] leading-[1.02] tracking-[-0.03em]">
            <span className="block">Waiting list.</span> <span className="block font-light">Be first for Basic and Premium.</span>
          </h2>
          <p className="mt-3 text-[15px] text-[var(--ink2)]">
            Paid plans aren&apos;t open yet. Join the list and tell us what you&apos;d use most, and we&apos;ll let you know when
            they open. Joining is free and doesn&apos;t sign you up for anything.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            className="grid size-10 flex-none place-items-center rounded-full bg-white/70 hover:bg-white"
            onClick={onClose}
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {entry && (
        <p className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[14px]">
          <span className="grid size-7 flex-none place-items-center rounded-full bg-[var(--ink)] text-white">
            <Check />
          </span>
          <span>
            <b>You&apos;re on the list</b> for {CHOICES.find((c) => c.v === entry.plan)?.name ?? "a paid plan"} since{" "}
            {when(entry.created_at)}.
          </span>
        </p>
      )}

      <fieldset className="grid gap-3">
        <legend className="label">{signedIn ? "Which plan would you want?" : "The plans"}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {CHOICES.map((c) => {
            const on = signedIn && plan === c.v;
            return (
              <button
                key={c.v}
                type="button"
                disabled={!signedIn || !ready}
                aria-pressed={signedIn ? on : undefined}
                onClick={() => setPlan(c.v)}
                className={`waitlist-plan ${on ? "is-on" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <b className="text-[17px]">{c.name}</b>
                  <span className={`waitlist-tick ${on ? "is-on" : ""}`} aria-hidden="true">
                    <Check />
                  </span>
                </span>
                <span className="text-[14px] font-bold">{c.price}</span>
                <span className="text-[13px] text-[var(--ink2)]">{c.line}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!signedIn ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn" onClick={onClose}>
            Sign up free to join
          </Link>
          <Link href="/login" className="btn btn-ghost bg-white" onClick={onClose}>
            Log in
          </Link>
          <span className="text-[13px] text-[var(--ink2)]">You join from your account, so we know who to tell.</span>
        </div>
      ) : !ready ? (
        <p className="text-[14px] font-bold">The waiting list opens soon.</p>
      ) : (
        <>
          <fieldset className="grid gap-3">
            <legend className="label">What would you use most? Pick any.</legend>
            <div className="flex flex-wrap gap-2">
              {WANTS.map((w) => {
                const on = wants.includes(w.v);
                return (
                  <button key={w.v} type="button" className="pill waitlist-want" aria-pressed={on} onClick={() => toggle(w.v)}>
                    <span aria-hidden="true" className="waitlist-want-mark">
                      {on ? <Check /> : "+"}
                    </span>
                    {w.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <label htmlFor={`waitlist-note-${variant}`} className="label">
              Anything else you&apos;d want? (optional)
            </label>
            <textarea
              id={`waitlist-note-${variant}`}
              rows={2}
              maxLength={500}
              className="field !text-[14px]"
              placeholder="For example: a cheaper student price, more interview practice, LinkedIn import…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-lg" disabled={busy} onClick={join}>
              {busy ? "Saving…" : entry ? "Save changes" : "Join the waiting list"}
            </button>
            {entry && (
              <button type="button" className="btn btn-ghost bg-white" disabled={busy} onClick={leave}>
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
    </Root>
  );
}
