"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import CompareToast, { type CompareState } from "@/components/CompareToast";
import Dialog from "@/components/Dialog";
import { compareRoles } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/client";
import CloseIcon from "@/components/CloseIcon";

/** Tells the bell to fetch its list again. */
export const refreshNotifications = () => window.dispatchEvent(new Event("rk:notify"));

type Progress = { title: string; detail: string; done: boolean; href?: string; link?: string } | null;

type Tasks = {
  compare: (ids: string[], names: string[]) => void;
  comparing: boolean;
  /** Scores every open role again with the latest profile. */
  rescore: () => void;
  /** Checks the connected Gmail, or helps connect it. */
  checkEmails: () => void;
  checking: boolean;
};

const Ctx = createContext<Tasks>({ compare: () => {}, comparing: false, rescore: () => {}, checkEmails: () => {}, checking: false });

export const useTasks = () => useContext(Ctx);
export const useCompare = () => {
  const t = useTasks();
  return { start: t.compare, busy: t.comparing };
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Lives in the root layout, so a comparison, a re-score or an inbox check keeps running (and its pop-up
 * stays) while you move between pages. Results also land in the bell.
 */
export function TasksProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [compareToast, setCompareToast] = useState<CompareState | null>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const [rescoring, setRescoring] = useState(false);
  const [checking, setChecking] = useState(false);
  const [gmailHelp, setGmailHelp] = useState<null | "connect" | "expired" | "unavailable">(null);

  async function compare(ids: string[], names: string[]) {
    setCompareToast({ state: "working", names });
    try {
      const id = await compareRoles(ids);
      setCompareToast({ state: "done", names, id });
    } catch (e) {
      setCompareToast({ state: "error", names, msg: e instanceof Error ? e.message : "Couldn't compare these roles." });
    }
  }

  const rescore = useCallback(async () => {
    if (rescoring) return;
    const { data } = await createClient()
      .from("applications")
      .select("id,company,title")
      .eq("status", "interested")
      .eq("job_status", "ready")
      .in("verdict", ["open", "barrier"]);
    const roles = data ?? [];
    if (!roles.length) return;
    setRescoring(true);
    let done = 0;
    let changed = 0;
    let stopped = "";
    setProgress({ title: "Updating your scores…", detail: `With your new profile. 0 of ${roles.length} roles.`, done: false });
    // Two at a time: quick, without hitting the AI all at once.
    for (let i = 0; i < roles.length && !stopped; i += 2) {
      await Promise.all(
        roles.slice(i, i + 2).map(async (r) => {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, rescore: true }),
          });
          const body = await res.json().catch(() => ({}));
          if (res.status === 429) stopped = body.error ?? "Today's limit is reached.";
          else if (res.ok && body.changed) changed++;
          done++;
          setProgress({ title: "Updating your scores…", detail: `With your new profile. ${done} of ${roles.length} roles.`, done: false });
        }),
      );
    }
    setRescoring(false);
    setProgress({
      title: stopped ? "Scores partly updated" : "Your scores are up to date",
      detail: stopped
        ? `${done} of ${roles.length} roles re-checked. ${stopped}`
        : changed
          ? `${changed} of ${roles.length} roles changed. See the bell for what moved.`
          : `All ${roles.length} roles re-checked. No score changed.`,
      done: true,
      href: "/app",
      link: "Open your board",
    });
    refreshNotifications();
    router.refresh();
  }, [rescoring, router]);

  const checkEmails = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setProgress({ title: "Checking your emails…", detail: "Looking for news about your applications.", done: false });
    try {
      const res = await fetch("/api/gmail/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ today: localToday() }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error ?? "Couldn't check your emails.");
      if (r.state !== "done") {
        setProgress(null);
        setGmailHelp(r.state === "unavailable" ? "unavailable" : r.expired ? "expired" : "connect");
        return;
      }
      setProgress({
        title: r.updates ? `${r.updates} update${r.updates > 1 ? "s" : ""} found` : "No news yet",
        detail: r.updates
          ? "Open the bell to review and apply them."
          : r.roles
            ? `Checked ${r.roles} application${r.roles > 1 ? "s" : ""}${r.emails ? ` and ${r.emails} email${r.emails > 1 ? "s" : ""}` : ""}. Nothing changes your status.`
            : "Mark a role as applied first: rookie checks emails about your applications.",
        done: true,
      });
      refreshNotifications();
    } catch (e) {
      setProgress({ title: "Couldn't check your emails", detail: e instanceof Error ? e.message : "Try again.", done: true });
    } finally {
      setChecking(false);
    }
  }, [checking]);

  return (
    <Ctx.Provider value={{ compare, comparing: compareToast?.state === "working", rescore, checkEmails, checking }}>
      {children}
      <div className="rk-toasts">
        {progress && (
          <div role="status" aria-live="polite" className={`rk-toast ${progress.done ? "done" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="grid min-w-0 gap-1.5">
                {!progress.done && (
                  <span className="rk-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                )}
                <b className="text-[15px]">{progress.title}</b>
                <span className="text-[13px] text-[var(--onblack2)]">{progress.detail}</span>
                {progress.done && progress.href && (
                  <Link
                    href={progress.href}
                    className="act mt-1 justify-self-start !bg-[var(--mint)] !px-4 no-underline"
                    onClick={() => setProgress(null)}
                  >
                    {progress.link} →
                  </Link>
                )}
              </div>
              {progress.done && (
                <button
                  type="button"
                  aria-label="Close"
                  className="grid size-7 flex-none place-items-center rounded-full text-[var(--onblack2)] hover:bg-white/10 hover:text-white"
                  onClick={() => setProgress(null)}
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          </div>
        )}
        {compareToast && <CompareToast toast={compareToast} onClose={() => setCompareToast(null)} />}
      </div>

      <Dialog
        open={!!gmailHelp}
        title={gmailHelp === "unavailable" ? "Email checks aren't switched on yet" : "Connect your Gmail"}
        onCancel={() => setGmailHelp(null)}
        actions={
          gmailHelp === "unavailable"
            ? [{ label: "OK", onClick: () => setGmailHelp(null) }]
            : [
                { label: "Not now", tone: "ghost", onClick: () => setGmailHelp(null) },
                { label: "Connect Gmail", onClick: () => window.location.assign("/api/gmail/connect") },
              ]
        }
      >
        {gmailHelp === "unavailable" ? (
          <p>
            rookie can&apos;t connect to Gmail here yet. Until it can, paste an email into &quot;Got an email?&quot; on the
            Applications page and rookie reads it the same way.
          </p>
        ) : (
          <div className="grid gap-2">
            {gmailHelp === "expired" && <p className="font-bold text-[var(--ink)]">Your Gmail connection ran out. Connect it again to keep checking.</p>}
            <p>rookie looks for emails about the companies you applied to and suggests status updates. How it works:</p>
            <ol className="list-decimal pl-5">
              <li>Press Connect Gmail and pick your Google account.</li>
              <li>
                Google may say the app isn&apos;t verified yet. Press <b>Advanced</b>, then <b>Go to rookie</b>.
              </li>
              <li>Allow rookie to read your emails. It can&apos;t send, change or delete anything.</li>
            </ol>
            <p className="text-[13px]">
              Only emails mentioning your applications are read, by Google Gemini, and they aren&apos;t stored. Disconnect any
              time on your Profile.
            </p>
          </div>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}
