"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CloseIcon from "@/components/CloseIcon";

type Msg = { role: "user" | "assistant"; text: string; links?: { label: string; href: string }[] };

const STARTERS = ["Which role should I focus on this week?", "How do I prepare for my next interview?", "What's missing from my profile?"];
/** Chat history lives in this browser only, per signed-in user, and is cleared on log out. */
export const CHAT_STORE = "rookie-chats";
const MAX_CHATS = 20;

type Chat = { id: string; title: string; updated: string; msgs: Msg[] };

const readChats = (key: string): Chat[] => {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const when = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (days < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

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
 * and profile and links you to the right page; it doesn't change anything. Earlier chats are kept in this
 * browser (History) until you log out.
 */
export default function ChatBubble({ userId }: { userId: string }) {
  const key = `${CHAT_STORE}:${userId}`;
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>(() => readChats(key));
  // The chat on screen; null is a fresh one that's saved once you ask something.
  const [current, setCurrent] = useState<string | null>(() => readChats(key)[0]?.id ?? null);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const msgs = chats.find((c) => c.id === current)?.msgs ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(chats.slice(0, MAX_CHATS)));
    } catch {
      // Private window: the history just isn't kept.
    }
  }, [chats, key]);

  /** Puts the messages into a chat (a new one if needed) and moves it to the top of the history. */
  function save(id: string | null, next: Msg[]) {
    const chatId = id ?? crypto.randomUUID();
    setChats((list) => {
      const old = list.find((c) => c.id === chatId);
      const chat: Chat = {
        id: chatId,
        title: old?.title ?? next.find((m) => m.role === "user")?.text.slice(0, 80) ?? "New chat",
        updated: new Date().toISOString(),
        msgs: next.slice(-40),
      };
      return [chat, ...list.filter((c) => c.id !== chatId)].slice(0, MAX_CHATS);
    });
    return chatId;
  }

  function newChat() {
    setCurrent(null);
    setShowHistory(false);
    setErr(null);
    setTimeout(() => input.current?.focus(), 0);
  }

  function removeChat(id: string) {
    setChats((list) => list.filter((c) => c.id !== id));
    if (current === id) setCurrent(null);
  }

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
    const id = save(current, next);
    setCurrent(id);
    setShowHistory(false);
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
      save(id, [...next, { role: "assistant", text: d.answer, links: d.links }]);
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
          <CloseIcon size={18} />
        ) : (
          <RookieBot />
        )}
        {!open && (
          <span className="chat-name" aria-hidden="true">
            <b>Hi, I&apos;m Rookie</b>
            <span>Questions or doubts about a role, your CV or an interview? Ask me, I know your board.</span>
          </span>
        )}
      </button>

      {open && (
        <section id="chat-panel" className="chat-panel" role="dialog" aria-label="Ask Rookie">
          <div className="chat-card">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="chat-avatar grid size-9 flex-none place-items-center rounded-full bg-white ring-1 ring-[var(--line)]" aria-hidden="true">
                <RookieBot size={30} />
              </span>
              <span className="min-w-0">
                <b className="text-[16px]">Rookie</b>
                <span className="block truncate text-[12px] text-[var(--mute)]">
                  {showHistory ? "Your earlier chats" : "Your application helper"}
                </span>
              </span>
            </span>
            <span className="flex flex-none gap-1.5">
              {chats.length > 0 && (
                <button type="button" className="chat-tool" aria-pressed={showHistory} onClick={() => setShowHistory((h) => !h)}>
                  History
                </button>
              )}
              {(msgs.length > 0 || showHistory) && (
                <button type="button" className="chat-tool" onClick={newChat}>
                  ＋ New
                </button>
              )}
            </span>
          </header>

          {showHistory ? (
            <div className="grid flex-1 content-start gap-1.5 overflow-y-auto px-3 py-3">
              {chats.map((c, n) => (
                <div key={c.id} className={`chat-row ${c.id === current ? "is-current" : ""}`} style={{ animationDelay: `${n * 35}ms` }}>
                  <button
                    type="button"
                    className="grid min-w-0 flex-1 gap-0.5 text-left"
                    onClick={() => {
                      setCurrent(c.id);
                      setShowHistory(false);
                    }}
                  >
                    <span className="truncate text-[14px] font-bold">{c.title}</span>
                    <span className="text-[12px] text-[var(--mute)]">
                      {when(c.updated)} · {Math.ceil(c.msgs.length / 2)} question{c.msgs.length > 2 ? "s" : ""}
                    </span>
                  </button>
                  <button type="button" className="chat-row-x" aria-label={`Delete chat: ${c.title}`} onClick={() => removeChat(c.id)}>
                    <CloseIcon size={11} />
                  </button>
                </div>
              ))}
              {chats.length === 0 && <p className="px-1 text-[14px] text-[var(--ink2)]">No earlier chats yet.</p>}
            </div>
          ) : (
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
          )}

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
            Answered by Google Gemini. Your chats stay in this browser and are deleted when you log out. AI can be wrong.
          </p>
          </div>
        </section>
      )}
    </>
  );
}

/** Rookie, the helper bot: one thin line weight, a lilac visor and a mint antenna tip. Playful, not cartoonish. */
function RookieBot({ size = 46 }: { size?: number }) {
  return (
    <svg className="bot" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="#0b0b0c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <g className="bot-antenna">
          <path d="M24 11V7" />
          <circle cx="24" cy="5.4" r="1.7" fill="#bfeccf" />
        </g>
        <path d="M9.2 19.5v6M38.8 19.5v6" />
        <rect x="11.5" y="11" width="25" height="21.5" rx="8.5" fill="#ffffff" />
        <rect x="15.5" y="15.2" width="17" height="12.4" rx="5.2" fill="#dcd6fb" />
        <path className="bot-smile" d="M21.7 24q2.3 1.5 4.6 0" />
        <path d="M15.8 40.8c0-3 3.7-5.1 8.2-5.1s8.2 2.1 8.2 5.1" />
      </g>
      <g className="bot-eyes" fill="#0b0b0c">
        <rect x="19.4" y="18.6" width="2.2" height="3.6" rx="1.1" />
        <rect x="26.4" y="18.6" width="2.2" height="3.6" rx="1.1" />
      </g>
    </svg>
  );
}
