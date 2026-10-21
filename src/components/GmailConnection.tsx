"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/components/Tasks";

type Account = { id: string; email: string | null; lastChecked: string | null };
type Status = { configured: boolean; multiple: boolean; accounts: Account[] };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Profile tile: connect one or more Gmail accounts (read-only) so "Check emails" can look for news about your
 * applications. Check all of them at once, or one at a time.
 */
export default function GmailConnection({ allowed, onAllowed }: { allowed: boolean; onAllowed: (on: boolean) => void }) {
  const { checkEmails, checking } = useTasks();
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gmail")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSt({ configured: d.configured, multiple: !!d.multiple, accounts: d.accounts ?? [] }))
      .catch(() => setSt(null));
  }, []);

  const accounts = st?.accounts ?? [];

  async function toggle() {
    const on = !allowed;
    // Switching off also disconnects every Gmail account, so nothing can be read any more.
    if (!on && accounts.length) await disconnect();
    onAllowed(on);
  }

  async function disconnect(id?: string) {
    setBusy(id ?? "all");
    await fetch(`/api/gmail${id ? `?id=${encodeURIComponent(id)}` : ""}`, { method: "DELETE" }).catch(() => {});
    setSt((s) => (s ? { ...s, accounts: id ? s.accounts.filter((a) => a.id !== id) : [] } : s));
    setBusy(null);
  }

  return (
    <section className="tile tile-butter span-12 grid gap-4" aria-labelledby="gmail-h">
      <div className="max-w-[680px]">
        <h2 id="gmail-h" className="text-[18px]">
          <b>Emails</b> <span className="font-light">: let rookie spot replies from companies</span>
        </h2>
        <p className="mt-1 text-[14px] text-[var(--ink2)]">
          {!st
            ? "Checking…"
            : !st.configured
              ? "Email checks aren't switched on here yet. You can still paste an email on the Applications page."
              : accounts.length
                ? "rookie only reads emails that mention companies you applied to, and never sends or changes anything."
                : "Read-only access. rookie looks for emails about your applications and updates them, or suggests changes in the bell."}
        </p>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
        <span>
          <b className="block text-[14px]">Let rookie read my emails</b>
          <span className="text-[13px] text-[var(--ink2)]">
            {allowed
              ? "On: you can paste emails or check Gmail, and rookie updates your applications."
              : "Off: rookie never reads your emails, and the email buttons are hidden."}
          </span>
        </span>
        <input type="checkbox" role="switch" className="rk-switch" checked={allowed} onChange={toggle} aria-label="Let rookie read my emails" />
      </label>

      {allowed && st?.configured && (
        <>
          {accounts.length > 0 && (
            <ul className="grid gap-2" aria-label="Connected Gmail accounts">
              {accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-2.5">
                  <span className="min-w-0">
                    <b className="block truncate text-[14px]">{a.email ?? "Gmail account"}</b>
                    <span className="text-[12.5px] text-[var(--ink2)]">{a.lastChecked ? `Last checked ${when(a.lastChecked)}` : "Not checked yet"}</span>
                  </span>
                  <span className="flex gap-2">
                    {accounts.length > 1 && (
                      <button type="button" className="btn btn-ghost !py-1.5 !text-[13px]" disabled={checking} onClick={() => checkEmails(a.id)}>
                        Check this one
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost !py-1.5 !text-[13px]" disabled={busy !== null} onClick={() => disconnect(a.id)}>
                      {busy === a.id ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <span className="flex flex-wrap items-center gap-2">
            {accounts.length > 0 && (
              <button type="button" className="btn !py-2" disabled={checking} onClick={() => checkEmails("all")}>
                {checking ? "Checking…" : accounts.length > 1 ? `Check all ${accounts.length} accounts` : "Check emails now"}
              </button>
            )}
            {(accounts.length === 0 || st.multiple) && (
              <a className={`btn !py-2 no-underline ${accounts.length ? "btn-ghost" : ""}`} href="/api/gmail/connect">
                {accounts.length ? "＋ Add another account" : "Connect Gmail"}
              </a>
            )}
            {accounts.length > 0 && !st.multiple && (
              <span className="text-[12.5px] text-[var(--ink2)]">More accounts switch on with the next database update.</span>
            )}
          </span>
        </>
      )}
    </section>
  );
}
