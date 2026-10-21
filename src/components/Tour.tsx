"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { RookieBot } from "@/components/ChatBubble";
import { createClient } from "@/lib/supabase/client";

type Step = {
  path: string;
  /** What to outline on the page (a CSS selector); none for the welcome and the last step. */
  spot?: string;
  title: string;
  light: string;
  body: string;
  todo?: string;
};

const STEPS: Step[] = [
  {
    path: "/app",
    title: "Hi, I'm rookie.",
    light: "Let me show you around.",
    body: "rookie helps you pick the roles worth applying to, writes a tailored CV and cover letter for each, and keeps every application in one place. This takes about a minute.",
  },
  {
    path: "/profile",
    spot: '[aria-labelledby="upload-h"]',
    title: "Your profile.",
    light: "Everything starts here.",
    body: "Upload your CV and rookie fills in your profile. Add your story, the barriers that matter to you (like location or visa), and choose whether rookie may read your emails.",
    todo: "Upload your CV and press Save. You need a name and some experience to apply.",
  },
  {
    path: "/app",
    spot: "form:has(#core-input)",
    title: "Your board.",
    light: "Every role you're considering.",
    body: "Paste any job link and rookie reads it: an honest score out of 10, why you fit and the catch. From each role you can mark it as applied or get a tailored CV and Cover Letter.",
    todo: "Add your first role by pasting a job link.",
  },
  {
    path: "/app/barriers",
    spot: "main h1",
    title: "Barriers.",
    light: "You decide, not the AI.",
    body: "Roles that clash with your deal-breakers or concerns wait here for review, so your board stays focused. Keep them, rule them out or bin them.",
  },
  {
    path: "/app/applications",
    spot: "main h1",
    title: "Applications.",
    light: "Where everything stands.",
    body: "Every role you applied to, with its status and next step. Paste an email from a company, or check your Gmail, and rookie suggests the update for you.",
  },
  {
    path: "/app/compare",
    spot: "main h1",
    title: "Compare.",
    light: "The best pick, side by side.",
    body: "Put two to four roles next to each other: which suits you best, with the pros and cons of each.",
  },
  {
    path: "/app/calendar",
    spot: "#cal-h",
    title: "Calendar.",
    light: "Every date at a glance.",
    body: "Deadlines, interviews and tests in a week or month view. Add any of them to Google or Apple Calendar in one click.",
  },
  {
    path: "/app/library",
    spot: "main h1",
    title: "Library.",
    light: "Every document, always there.",
    body: "All your tailored CVs and cover letters as PDF or Word, plus your own letters so rookie learns how you write.",
  },
  {
    path: "/app",
    spot: ".bell",
    title: "Updates and me.",
    light: "Never miss a thing.",
    body: "The bell collects new scores, deadlines, interviews and email news. And I'm always in the corner: ask me anything, or drag me wherever you like.",
  },
  {
    path: "/app",
    title: "Any questions?",
    light: "Ask me now, or later.",
    body: "Ask me anything about getting started. Or start exploring on your own: I'm in the corner whenever you need me.",
  },
];

const KEY = "rookie-tour-step";

/** Only for a real person: automated browsers (like the grading bot) never see the tour. */
const automated = () => typeof navigator !== "undefined" && navigator.webdriver === true;

/**
 * First-time onboarding: rookie walks a new user through every page, what it's for and the first to-dos, then
 * offers to answer questions. Shown once (saved on the account); "Take the tour again" on the Profile restarts it.
 */
export default function Tour({ onboarded }: { onboarded: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [spotRect, setRect] = useState<DOMRect | null>(null);
  // The step whose page has finished loading; until then the card shows rookie waiting, not a half-loaded page.
  const [readyStep, setReadyStep] = useState<number | null>(null);
  const [question, setQuestion] = useState("");

  // Start for new users (or resume after a reload), and whenever "Take the tour again" asks.
  useEffect(() => {
    if (automated()) return;
    let saved: number | null = null;
    try {
      const v = sessionStorage.getItem(KEY);
      saved = v === null ? null : Number(v);
    } catch {
      // ignore
    }
    const t = setTimeout(() => {
      if (saved !== null && saved >= 0 && saved < STEPS.length) setStep(saved);
      else if (!onboarded) setStep(0);
    }, 600);
    const again = () => setStep(0);
    window.addEventListener("rk:tour", again);
    return () => {
      clearTimeout(t);
      window.removeEventListener("rk:tour", again);
    };
  }, [onboarded]);

  const s = step === null ? null : STEPS[step];

  // Keep the step across page changes and reloads.
  useEffect(() => {
    try {
      if (step === null) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, String(step));
    } catch {
      // ignore
    }
  }, [step]);

  // Go to the step's page, wait until it has loaded (no loading screen, and its element is there), then
  // outline the element and show the step.
  useLayoutEffect(() => {
    if (!s || step === null) return;
    if (path !== s.path) {
      router.push(s.path);
      return;
    }
    let tries = 0;
    let frame = 0;
    let el: Element | null = null;
    const loading = () => !!document.querySelector(".rk-loader");
    const measure = () => {
      const target = (el as HTMLElement | null)?.closest("section, form, .tile") ?? el;
      setRect(target ? target.getBoundingClientRect() : null);
    };
    const find = () => {
      el = s.spot ? document.querySelector(s.spot) : null;
      const done = !loading() && (!s.spot || el);
      if (done) {
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          frame = window.setTimeout(() => {
            measure();
            setReadyStep(step);
          }, 450);
        } else setReadyStep(step);
      } else if (tries++ < 80) frame = window.setTimeout(find, 100);
      else {
        // Give up waiting after ~8 seconds and show the step without an outline.
        setRect(null);
        setReadyStep(step);
      }
    };
    find();
    const onMove = () => el && measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      clearTimeout(frame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [s, step, path, router]);

  const finish = useCallback(async () => {
    setStep(null);
    setRect(null);
    // Saved on the account, so the tour shows once, on any device.
    await createClient()
      .auth.updateUser({ data: { onboarded: true } })
      .catch(() => {});
    router.refresh();
  }, [router]);

  function askNow() {
    const q = question.trim();
    void finish();
    if (q) window.dispatchEvent(new CustomEvent("rk:ask", { detail: q }));
    else window.dispatchEvent(new Event("rk:open-chat"));
  }

  if (!s || step === null) return null;

  // While the next page loads: just rookie, busy, instead of a half-loaded page behind the card.
  if (readyStep !== step) {
    return (
      <div className="tour" role="dialog" aria-modal="true" aria-label="Loading the next step">
        <div className="tour-dim is-solid" aria-hidden="true" />
        <div className="tour-wait" role="status">
          <span className="tour-wait-bot" aria-hidden="true">
            <RookieBot size={64} />
          </span>
          <span className="rk-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <p className="text-[14px] font-bold text-white">Getting the next page ready…</p>
        </div>
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  // Only outline something on steps that have a target.
  const rect = s.spot ? spotRect : null;
  // The card sits in the middle; with something outlined, above or below it so it never covers it.
  const place = !rect ? "center" : rect.top + rect.height / 2 > window.innerHeight / 2 ? "top" : "bottom";
  const pad = 10;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="tour-spot"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          aria-hidden="true"
        />
      ) : (
        <div className="tour-dim" aria-hidden="true" />
      )}
      <div key={step} className={`tour-card is-${place}`}>
        <div className="flex items-start gap-3.5">
          <span className="tour-bot flex-none" aria-hidden="true">
            <RookieBot size={46} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-[var(--mute)]">
              {step + 1} of {STEPS.length}
            </p>
            <h2 id="tour-title" className="mt-0.5 text-[22px] leading-tight tracking-tight">
              <b>{s.title}</b> <span className="font-light">{s.light}</span>
            </h2>
          </div>
        </div>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--ink2)]">{s.body}</p>
        {s.todo && (
          <p className="mt-3 rounded-2xl bg-[var(--mint)] px-3.5 py-2.5 text-[13.5px]">
            <b>Your to-do:</b> {s.todo}
          </p>
        )}
        {last && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              askNow();
            }}
          >
            <label htmlFor="tour-q" className="sr-only">
              Your question for rookie
            </label>
            <input
              id="tour-q"
              className="field !py-2.5 !text-[14px]"
              placeholder="e.g. Where do I start if I have no CV yet?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn !py-2.5" disabled={!question.trim()}>
              Ask
            </button>
          </form>
        )}
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={`tour-dot ${i === step ? "is-on" : i < step ? "is-done" : ""}`} />
            ))}
          </span>
          <span className="flex flex-wrap justify-end gap-2">
            {!last && (
              <button type="button" className="mr-4 text-[13px] font-bold text-[var(--mute)] hover:text-[var(--ink)]" onClick={finish}>
                Skip tour
              </button>
            )}
            {step > 0 && (
              <button type="button" className="btn btn-ghost !py-2" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            {last ? (
              <button type="button" className="btn !py-2" onClick={finish}>
                Start exploring
              </button>
            ) : (
              <button type="button" className="btn !py-2" onClick={() => setStep(step + 1)}>
                {step === 0 ? "Show me" : "Next"}
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
