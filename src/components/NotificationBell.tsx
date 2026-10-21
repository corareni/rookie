"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Dialog from "@/components/Dialog";
import { SuggestionCard, type EmailRole } from "@/components/EmailUpdate";
import { useTasks } from "@/components/Tasks";
import type { EmailUpdate } from "@/lib/ai-client";
import { eventLabel } from "@/lib/calendar";
import { loadNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  kind: "analysed" | "score" | "deadline" | "event" | "email" | "profile";
  title: string;
  body: string;
  href: string | null;
  application_id: string | null;
  data: { suggestion?: EmailUpdate; at?: string } | null;
  read_at: string | null;
  created_at: string;
};

const DOT: Record<Item["kind"], string> = {
  analysed: "bg-[var(--mint)]",
  score: "bg-[var(--lilac)]",
  deadline: "bg-[var(--peach)]",
  event: "bg-[var(--sky)]",
  email: "bg-[var(--butter)]",
  profile: "bg-[var(--mint)]",
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

/**
 * The bell: updates about your roles (analysis done, scores that moved after a profile update, deadlines and
 * interviews coming up, news from your emails). Click one to open it, × to delete it.
 */
export default function NotificationBell() {
  const router = useRouter();
  const { checkEmails, checking } = useTasks();
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<{ item: Item; role: EmailRole } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const d = await loadNotifications(createClient()).catch(() => null);
    if (!d) return;
    setReady(d.ready);
    setItems((d.items ?? []) as Item[]);
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 120_000);
    window.addEventListener("rk:notify", load);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("rk:notify", load);
    };
  }, [load]);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const unread = items.filter((i) => !i.read_at).length;
  const db = () => createClient().from("notifications");

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((list) => list.map((i) => (ids.includes(i.id) ? { ...i, read_at: i.read_at ?? now } : i)));
    await db().update({ read_at: now }).in("id", ids);
  }

  async function remove(id: string) {
    setItems((list) => list.filter((i) => i.id !== id));
    await db().update({ dismissed_at: new Date().toISOString() }).eq("id", id);
  }

  async function openItem(i: Item) {
    void markRead([i.id]);
    if (i.kind === "email" && i.data?.suggestion && i.application_id) {
      const sb = createClient();
      const [{ data: a }, { data: ev }] = await Promise.all([
        sb.from("applications").select("id,title,company,role,status,submitted_on,assessment_on,interview_on,offer_on").eq("id", i.application_id).maybeSingle(),
        sb.from("applications").select("event_at,event_kind").eq("id", i.application_id).maybeSingle(),
      ]);
      if (a) {
        setOpen(false);
        setEmail({ item: i, role: { ...(a as EmailRole), event_at: ev?.event_at ?? null, event_kind: ev?.event_kind ?? null } });
        return;
      }
    }
    setOpen(false);
    if (i.href) router.push(i.href);
  }

  return (
    <div ref={box} className="relative flex-none">
      <button
        type="button"
        className="bell"
        aria-label={unread ? `Updates, ${unread} new` : "Updates"}
        aria-expanded={open}
        aria-controls="bell-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div id="bell-panel" className="bell-panel" role="dialog" aria-label="Updates">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <b className="text-[15px]">Updates</b>
            {unread > 0 && (
              <button type="button" className="bell-act" onClick={() => markRead(items.filter((i) => !i.read_at).map((i) => i.id))}>
                Mark all read
              </button>
            )}
          </div>

          {!ready ? (
            <p className="px-1 pb-2 text-[13px] text-[var(--onblack2)]">Updates switch on with the next database update.</p>
          ) : items.length === 0 ? (
            <p className="px-1 pb-2 text-[13px] text-[var(--onblack2)]">
              Nothing new. Updates appear here when a role is analysed, a score changes, a deadline or interview is close, or
              an email brings news.
            </p>
          ) : (
            <ul className="grid max-h-[min(420px,60vh)] gap-1.5 overflow-y-auto">
              {items.map((i) => (
                <li key={i.id} className={`bell-item ${i.read_at ? "" : "is-new"}`}>
                  <span className={`mt-1.5 size-2.5 flex-none rounded-full ${DOT[i.kind]}`} aria-hidden="true" />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openItem(i)}>
                    <span className={`block text-[13.5px] leading-snug ${i.read_at ? "" : "font-bold"}`}>{i.title}</span>
                    {(i.body || i.data?.at) && (
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--onblack2)]">
                        {i.data?.at && <>{eventLabel(i.data.at)}. </>}
                        {i.body}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[11.5px] text-[var(--onblack2)]">{ago(i.created_at)}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete: ${i.title}`}
                    className="bell-x"
                    onClick={() => remove(i.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 border-t border-white/10 pt-2">
            <button
              type="button"
              className="pillbtn pillbtn-mint w-full justify-center"
              disabled={checking}
              onClick={() => {
                setOpen(false);
                checkEmails();
              }}
            >
              {checking ? "Checking emails…" : "Check emails"}
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={!!email}
        title={email ? email.item.title : ""}
        onCancel={() => setEmail(null)}
        actions={[{ label: "Close", tone: "ghost", onClick: () => setEmail(null) }]}
      >
        {email && (
          <SuggestionCard
            role={email.role}
            s={email.item.data!.suggestion!}
            onDismiss={() => {
              void remove(email.item.id);
              setEmail(null);
            }}
            onDone={() => {
              void remove(email.item.id);
              setEmail(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
