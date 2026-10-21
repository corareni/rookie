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
        className="chat-fab"
        aria-label={open ? "Close Ask Rookie" : "Ask Rookie a question"}
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <span aria-hidden="true" className="text-[22px] leading-none">
            ×
          </span>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
            <circle cx="9" cy="9.5" r="0.6" fill="currentColor" />
            <circle cx="12" cy="9.5" r="0.6" fill="currentColor" />
            <circle cx="15" cy="9.5" r="0.6" fill="currentColor" />
          </svg>
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
