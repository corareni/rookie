"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/components/Tasks";

type Status = { configured: boolean; connected: boolean; email: string | null; lastChecked: string | null };

/** Profile tile: connect Gmail (read-only) so "Check emails" can look for news about your applications. */
export default function GmailConnection({ allowed, onAllowed }: { allowed: boolean; onAllowed: (on: boolean) => void }) {
  const { checkEmails, checking } = useTasks();
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/gmail")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSt)
      .catch(() => setSt(null));
  }, []);

  async function toggle() {
    const on = !allowed;
    // Switching off also disconnects Gmail, so nothing can be read any more.
    if (!on && st?.connected) await disconnect();
    onAllowed(on);
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/gmail", { method: "DELETE" }).catch(() => {});
    setSt((s) => (s ? { ...s, connected: false, email: null, lastChecked: null } : s));
    setBusy(false);
  }

  return (
    <section className="tile tile-butter span-12 flex flex-wrap items-center justify-between gap-4" aria-labelledby="gmail-h">
      <div className="max-w-[640px]">
        <h2 id="gmail-h" className="text-[18px]">
          <b>Emails</b> <span className="font-light">: let rookie spot replies from companies</span>
        </h2>
        <p className="mt-1 text-[14px] text-[var(--ink2)]">
          {!st
            ? "Checking…"
            : !st.configured
              ? "Email checks aren't switched on here yet. You can still paste an email on the Applications page."
              : st.connected
                ? `Connected${st.email ? ` as ${st.email}` : ""}. rookie only reads emails that mention companies you applied to, never sends or changes anything.${
                    st.lastChecked ? ` Last checked ${new Date(st.lastChecked).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : ""
                  }`
                : "Read-only access. rookie looks for emails about your applications and suggests status updates in the bell. You approve every change."}
        </p>
      </div>
      <label className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
        <span>
          <b className="block text-[14px]">Let rookie read my emails</b>
          <span className="text-[13px] text-[var(--ink2)]">
            {allowed
              ? "On: you can paste emails or check Gmail, and rookie suggests status updates."
              : "Off: rookie never reads your emails, and the email buttons are hidden."}
          </span>
        </span>
        <input type="checkbox" role="switch" className="rk-switch" checked={allowed} onChange={toggle} aria-label="Let rookie read my emails" />
      </label>
      {allowed && st?.configured && (
        <span className="flex flex-wrap gap-2">
          {st.connected ? (
            <>
              <button type="button" className="btn !py-2" disabled={checking} onClick={checkEmails}>
                {checking ? "Checking…" : "Check emails now"}
              </button>
              <button type="button" className="btn btn-ghost !py-2" disabled={busy} onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <a className="btn !py-2 no-underline" href="/api/gmail/connect">
              Connect Gmail
            </a>
          )}
        </span>
      )}
    </section>
  );
}
