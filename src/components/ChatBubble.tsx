"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string; links?: { label: string; href: string }[] };

const STARTERS = ["Which role should I focus on this week?", "How do I prepare for my next interview?", "What's missing from my profile?"];
const STORE = "rookie-chat";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Plain text with "- " bullets, as the assistant writes it: runs of bullet lines become a list. */
function Answer({ text }: { text: string }) {
  const groups: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      groups.push({ list: false, lines: [] });
      continue;
    }
    const list = /^[-•*]\s/.test(line);
    const last = groups.at(-1);
    if (last && last.list === list && last.lines.length) last.lines.push(line.replace(/^[-•*]\s/, ""));
    else groups.push({ list, lines: [line.replace(/^[-•*]\s/, "")] });
  }
  return (
    <div className="grid gap-2">
      {groups
        .filter((g) => g.lines.length)
        .map((g, i) =>
          g.list ? (
            <ul key={i} className="grid list-disc gap-1 pl-4">
              {g.lines.map((l, j) => (
                <li key={j}>{l}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{g.lines.join(" ")}</p>
          ),
        )}
    </div>
  );
}

/**
 * "Ask Rookie": a round button in the corner of every page that opens a chat. It answers from your own board
 * and profile and links you to the right page; it doesn't change anything. Chats stay in this tab only.
 */
export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORE) ?? "[]") as Msg[];
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {
      // Private window: the chat just isn't kept.
    }
  }, [msgs]);

  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "end" });
  }, [open, msgs, busy]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, text: q }];
    setMsgs(next);
    setDraft("");
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, text })), today: localToday() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't answer just now. Try again.");
      setMsgs([...next, { role: "assistant", text: d.answer, links: d.links }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't answer just now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? "is-open" : ""}`}
        aria-label={open ? "Close the chat with Rookie" : "Chat with Rookie, your application helper"}
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          // Two lines, so the × sits exactly in the middle (a text × sits off-centre in most fonts).
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <RookieBot />
        )}
        {!open && (
          <span className="chat-name" aria-hidden="true">
            Hi, I&apos;m Rookie
          </span>
        )}
      </button>

      {open && (
        <section id="chat-panel" className="chat-panel" role="dialog" aria-label="Ask Rookie">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <span>
              <b className="text-[16px]">Ask Rookie</b>
              <span className="block text-[12px] text-[var(--mute)]">Answers from your board and profile</span>
            </span>
            {msgs.length > 0 && (
              <button type="button" className="text-[12.5px] font-bold text-[var(--mute)] hover:text-[var(--ink)]" onClick={() => setMsgs([])}>
                Clear
              </button>
            )}
          </header>

          <div className="grid flex-1 content-start gap-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {msgs.length === 0 && (
              <div className="grid gap-2">
                <p className="text-[14px] text-[var(--ink2)]">
                  Ask anything about your applications: what to focus on, how to prepare, what to improve.
                </p>
                {STARTERS.map((s) => (
                  <button key={s} type="button" className="chat-starter" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="chat-msg chat-user">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="chat-msg chat-bot">
                  <Answer text={m.text} />
                  {!!m.links?.length && (
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <Link key={l.href + l.label} href={l.href} className="chat-link" onClick={() => setOpen(false)}>
                          {l.label} →
                        </Link>
                      ))}
                    </span>
                  )}
                </div>
              ),
            )}
            {busy && (
              <span className="rk-dots chat-msg chat-bot !w-auto justify-self-start" aria-label="Thinking">
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
            {err && (
              <p role="alert" className="text-[13px] font-bold text-[var(--bad)]">
                {err}
              </p>
            )}
            <div ref={end} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-[var(--line)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="chat-input"
              ref={input}
              rows={1}
              className="field max-h-[120px] min-h-[42px] flex-1 resize-none !py-2.5 !text-[14px]"
              placeholder="Ask a question…"
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(draft);
                }
              }}
            />
            <button type="submit" className="btn !min-h-[42px] !px-4 !py-2" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
          <p className="px-4 pb-3 text-[11.5px] text-[var(--mute)]">
            Answered by Google Gemini. Chats aren&apos;t saved. AI can be wrong.
          </p>
        </section>
      )}
    </>
  );
}

/** Rookie, the little helper bot: white head, sky visor, mint antenna and body, in the site's pastels. */
function RookieBot() {
  return (
    <svg className="bot" viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
      <g fill="none" stroke="#0b0b0c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <g className="bot-antenna">
          <path d="M24 9V4.8" />
          <circle cx="24" cy="4" r="2.6" fill="#bfeccf" />
        </g>
        <rect x="15.5" y="34" width="17" height="10" rx="4.5" fill="#bfeccf" />
        <rect x="6.5" y="19" width="5" height="10" rx="2.5" fill="#c9c0fb" />
        <rect x="36.5" y="19" width="5" height="10" rx="2.5" fill="#c9c0fb" />
        <rect x="10" y="9" width="28" height="26" rx="11" fill="#ffffff" />
        <rect x="14" y="14.5" width="20" height="14" rx="6.5" fill="#b9d9f8" />
        <path d="M20.6 24.2q3.4 3 6.8 0" />
      </g>
      <g className="bot-eyes" fill="#0b0b0c">
        <circle cx="19.6" cy="20.6" r="1.9" />
        <circle cx="28.4" cy="20.6" r="1.9" />
      </g>
      <circle cx="16.8" cy="25" r="1.3" fill="#fccab0" />
      <circle cx="31.2" cy="25" r="1.3" fill="#fccab0" />
    </svg>
  );
}
