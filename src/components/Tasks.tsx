"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import CompareToast, { type CompareState } from "@/components/CompareToast";
import Dialog from "@/components/Dialog";
import { compareRoles } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/client";
import CloseIcon from "@/components/CloseIcon";

/** Tells the bell to fetch its list again. */
export const refreshNotifications = () => window.dispatchEvent(new Event("rk:notify"));

/** One role an email check moved to a new stage (or added), for the summary on Applications. */
export type EmailChange = { id: string; company: string; status: string; next: string; link: string | null; account: string | null };
export type EmailResults = { changes: EmailChange[]; review: number; accounts: number };

type Progress = { title: string; detail: string; done: boolean; href?: string; link?: string } | null;

type Tasks = {
  compare: (ids: string[], names: string[]) => void;
  comparing: boolean;
  /** Scores every open role again with the latest profile. */
  rescore: () => void;
  /** Checks all connected Gmail accounts (or one, by id), or helps connect one. */
  checkEmails: (account?: string) => void;
  checking: boolean;
  /** What the last email check changed (until dismissed). */
  emailResults: EmailResults | null;
  clearEmailResults: () => void;
  /** Shows the waiting pop-up while a job link is read; call the returned function when it's done. */
  trackReading: (name: string) => (r: { ok: true; name: string; href: string } | { ok: false; msg: string }) => void;
};

const Ctx = createContext<Tasks>({ compare: () => {}, comparing: false, rescore: () => {}, checkEmails: () => {}, checking: false, emailResults: null, clearEmailResults: () => {}, trackReading: () => () => {} });

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
  const [emailResults, setEmailResults] = useState<EmailResults | null>(null);
  // Pop-ups never cover rookie: they sit just above him (or below him if he's near the top), on his side of the
  // screen, and move to the top while his chat is open. Re-measured while a pop-up is showing, as he can be dragged.
  const toastsRef = useRef<HTMLDivElement>(null);
  const [toastPos, setToastPos] = useState<React.CSSProperties | null>(null);
  const showing = !!progress || !!compareToast;
  useEffect(() => {
    if (!showing) return;
    const place = () => {
      const dock = document.querySelector<HTMLElement>(".chat-dock");
      if (!dock) return setToastPos(null);
      const r = dock.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 12;
      const phone = vw < 640;
      const onRight = r.left + r.width / 2 > vw / 2;
      // Phones: always the full width; wider screens: lined up with rookie, kept on screen.
      const side: React.CSSProperties = phone
        ? { left: 16, right: 16, width: "auto" }
        : onRight
          ? { right: Math.max(16, vw - r.right), left: "auto" }
          : { left: Math.max(16, r.left), right: "auto" };
      let next: React.CSSProperties;
      const chat = dock.classList.contains("is-open") ? document.querySelector(".chat-card")?.getBoundingClientRect() : null;
      if (chat) {
        // Chat open: on the other side of the screen from it; on phones (the chat fills the screen) wait until it closes.
        next = phone
          ? { ...side, top: 84, bottom: "auto", opacity: 0, pointerEvents: "none" }
          : chat.left + chat.width / 2 > vw / 2
            ? { left: 16, right: "auto", top: 84, bottom: "auto" }
            : { right: 16, left: "auto", top: 84, bottom: "auto" };
      } else if (r.top + r.height / 2 > vh / 2) next = { ...side, bottom: vh - r.top + gap, top: "auto" };
      else next = { ...side, top: r.bottom + gap, bottom: "auto" };
      setToastPos((p) => (JSON.stringify(p) === JSON.stringify(next) ? p : next));
    };
    place();
    const t = setInterval(place, 250);
    window.addEventListener("resize", place);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", place);
    };
  }, [showing]);
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

  // Several links can be read at once; the pop-up keeps waiting until the last one is done.
  const reading = useRef(0);
  const trackReading = useCallback((name: string) => {
    reading.current++;
    const wait = (label: string) =>
      setProgress({
        title: "Reviewing the listing…",
        detail:
          reading.current > 1
            ? `${reading.current} links. rookie fills in company, role and deadline, then scores each one.`
            : `${label}. rookie fills in company, role and deadline, then scores it out of 10.`,
        done: false,
      });
    wait(name);
    return (r: { ok: true; name: string; href: string } | { ok: false; msg: string }) => {
      reading.current = Math.max(0, reading.current - 1);
      if (reading.current) return wait(name);
      setProgress(
        r.ok
          ? { title: "Role reviewed", detail: `${r.name} is scored and ready.`, done: true, href: r.href, link: "See rookie's take" }
          : { title: "Couldn't read that link", detail: r.msg, done: true },
      );
    };
  }, []);

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

  const checkEmails = useCallback(async (account?: unknown) => {
    if (checking) return;
    setChecking(true);
    setProgress({ title: "Checking your emails…", detail: "Looking for news about your applications.", done: false });
    try {
      const res = await fetch("/api/gmail/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Called straight from buttons too, so only a string is an account id.
        body: JSON.stringify({ today: localToday(), tz: new Date().getTimezoneOffset(), account: typeof account === "string" ? account : "all" }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error ?? "Couldn't check your emails.");
      if (r.state !== "done") {
        setProgress(null);
        setGmailHelp(r.state === "unavailable" ? "unavailable" : r.expired ? "expired" : "connect");
        return;
      }
      const extra = r.added
        ? ` ${r.added} new application${r.added > 1 ? "s" : ""} added to Applications${r.needsInfo ? `, ${r.needsInfo} need${r.needsInfo > 1 ? "" : "s"} details from you (see the bell)` : ""}.`
        : "";
      setProgress({
        title: r.updates || r.added ? `${(r.updates ?? 0) + (r.added ?? 0)} update${(r.updates ?? 0) + (r.added ?? 0) > 1 ? "s" : ""} found` : "No news yet",
        detail: r.updates
          ? (r.applied
              ? `${r.applied} application${r.applied > 1 ? "s" : ""} moved to a new stage. ${r.updates > r.applied ? "The rest are in the bell to review." : "See the bell for details."}`
              : "Open the bell to review and apply them.") + extra
          : r.added
            ? extra.trim()
          : r.roles
            ? `Checked ${r.roles} application${r.roles > 1 ? "s" : ""}${r.emails ? ` and ${r.emails} email${r.emails > 1 ? "s" : ""}` : ""}. Nothing changes your status.`
            : "No emails about applications found in your inbox.",
        done: true,
      });
      refreshNotifications();
      if (r.applied || r.added) router.refresh();
      if (Array.isArray(r.changes) && r.changes.length) {
        setEmailResults({ changes: r.changes, review: Math.max(0, (r.updates ?? 0) - (r.applied ?? 0)), accounts: r.accounts ?? 1 });
        // On Applications the summary card shows it all, so no pop-up on top.
        if (window.location.pathname === "/app/applications") setProgress(null);
      }
    } catch (e) {
      setProgress({ title: "Couldn't check your emails", detail: e instanceof Error ? e.message : "Try again.", done: true });
    } finally {
      setChecking(false);
    }
  }, [checking, router]);

  return (
    <Ctx.Provider value={{ compare, comparing: compareToast?.state === "working", rescore, checkEmails, checking, emailResults, clearEmailResults: () => setEmailResults(null), trackReading }}>
      {children}
      <div className="rk-toasts" ref={toastsRef} style={toastPos ?? undefined}>
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
                Google says it hasn&apos;t verified the app yet. Press <b>Continue</b> (on some screens: <b>Advanced</b>, then{" "}
                <b>Go to rookie</b>).
              </li>
              <li>Tick the box to let rookie read your emails, then Continue. It can&apos;t send, change or delete anything.</li>
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
