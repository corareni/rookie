"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/components/Tasks";

type Status = { configured: boolean; connected: boolean; email: string | null; lastChecked: string | null };

/** Profile tile: connect Gmail (read-only) so "Check emails" can look for news about your applications. */
export default function GmailConnection() {
  const { checkEmails, checking } = useTasks();
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/gmail")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSt)
      .catch(() => setSt(null));
  }, []);

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
          <b>Gmail</b> <span className="font-light">: let Rookie spot replies from companies</span>
        </h2>
        <p className="mt-1 text-[14px] text-[var(--ink2)]">
          {!st
            ? "Checking…"
            : !st.configured
              ? "Email checks aren't switched on here yet. You can still paste an email on the Applications page."
              : st.connected
                ? `Connected${st.email ? ` as ${st.email}` : ""}. Rookie only reads emails that mention companies you applied to, never sends or changes anything.${
                    st.lastChecked ? ` Last checked ${new Date(st.lastChecked).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : ""
                  }`
                : "Read-only access. Rookie looks for emails about your applications and suggests status updates in the bell. You approve every change."}
        </p>
      </div>
      {st?.configured && (
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
