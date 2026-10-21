"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { openWaitlist } from "@/components/WaitlistDialog";
import { createClient } from "@/lib/supabase/client";

type Hit = { key: string; label: string; detail: string; group: string; go: () => void };
type Entry = { label: string; detail: string; words: string; href?: string; action?: "waitlist" | "tour" };

// Pages and the things people look for most, with extra words so "cv", "gmail" or "delete" find them.
const APP_ENTRIES: Entry[] = [
  { label: "Board", detail: "Add a role, see your scores", words: "home roles add job link score", href: "/app" },
  { label: "Applications", detail: "Statuses, next steps, emails", words: "applied status interview offer rejected", href: "/app/applications" },
  { label: "Compare", detail: "Two to four roles side by side", words: "compare best pick pros cons", href: "/app/compare" },
  { label: "Barriers", detail: "Roles that clash with your deal-breakers", words: "barriers deal breakers ruled out", href: "/app/barriers" },
  { label: "Calendar", detail: "Deadlines, tests and interviews", words: "calendar dates deadline google apple", href: "/app/calendar" },
  { label: "Library", detail: "Every CV and cover letter", words: "library documents pdf word cv cover letter", href: "/app/library" },
  { label: "Profile", detail: "Your CV, experience and settings", words: "profile about me settings", href: "/profile" },
  { label: "Upload your CV", detail: "Profile", words: "upload cv resume import", href: "/profile#upload-h" },
  { label: "Email updates", detail: "Connect Gmail, check emails", words: "email gmail inbox connect", href: "/profile#gmail-h" },
  { label: "Your plan and usage", detail: "Limits this month", words: "plan usage limits premium basic free", href: "/profile#plan" },
  { label: "Waiting list", detail: "Be first for Basic and Premium", words: "waitlist waiting list premium basic upgrade", action: "waitlist" },
  { label: "Take the tour again", detail: "A quick walk through rookie", words: "tour help how start onboarding", action: "tour" },
  { label: "Delete my account", detail: "Profile", words: "delete account remove data", href: "/profile#delete-h" },
];
const SITE_ENTRIES: Entry[] = [
  { label: "How it works", detail: "From first link to first day", words: "how works steps", href: "/#how" },
  { label: "The numbers", detail: "Why applying needs a better system", words: "numbers stats data competition", href: "/#numbers" },
  { label: "Plans", detail: "Free, Basic and Premium", words: "plans pricing price premium basic free cost", href: "/#plans" },
  { label: "Waiting list", detail: "Be first for Basic and Premium", words: "waitlist waiting list premium", action: "waitlist" },
  { label: "Privacy", detail: "How your data is handled", words: "privacy data gdpr", href: "/privacy" },
  { label: "Sign up", detail: "Create a free account", words: "sign up register account", href: "/signup" },
  { label: "Log in", detail: "Back to your board", words: "log in login sign in", href: "/login" },
];

const OPEN = "rk:search";
export const openSearch = () => window.dispatchEvent(new Event(OPEN));

/** Characters that would break a PostgREST `or()` filter. */
const clean = (q: string) => q.replace(/[,()%*\\]/g, " ").trim();

function Glass({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The magnifying glass in the header. ⌘K / Ctrl+K or "/" opens it too. */
export function SearchButton() {
  return (
    <button type="button" className="bell" aria-label="Search rookie (⌘K)" title="Search (⌘K)" onClick={openSearch}>
      <Glass />
    </button>
  );
}

/** Search across pages, help topics, your roles and your documents. */
export default function SiteSearch({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<{ q: string; roles: Hit[]; docs: Hit[] }>({ q: "", roles: [], docs: [] });

  const close = () => setOpen(false);
  const go = (fn: () => void) => () => {
    close();
    fn();
  };

  useEffect(() => {
    const show = () => {
      setQ("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // Your own roles and documents, as you type (row-level security keeps it to your data).
  useEffect(() => {
    const term = clean(q);
    if (!signedIn || !open || term.length < 2) return;
    let stale = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term}%`;
      const [apps, docs] = await Promise.all([
        supabase
          .from("applications")
          .select("id,title,company,role,status")
          .or(`title.ilike.${like},company.ilike.${like},role.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("library_files").select("id,name").ilike("name", like).limit(4),
      ]);
      if (stale) return;
      setFound({
        q: term,
        roles: ((apps.data ?? []) as { id: string; title: string; company: string | null; role: string | null; status: string }[]).map((a) => ({
          key: `role-${a.id}`,
          label: a.role && a.company ? `${a.role} at ${a.company}` : a.title,
          detail: a.status.replace(/_/g, " "),
          group: "Your roles",
          go: () => router.push(`/app/a/${a.id}`),
        })),
        docs: ((docs.data ?? []) as { id: string; name: string }[]).map((d) => ({
          key: `doc-${d.id}`,
          label: d.name,
          detail: "Library",
          group: "Your documents",
          go: () => router.push("/app/library"),
        })),
      });
    }, 160);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q, open, signedIn, router]);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    const entries = signedIn ? APP_ENTRIES : SITE_ENTRIES;
    const pages = entries
      .filter((e) => !term || `${e.label} ${e.detail} ${e.words}`.toLowerCase().includes(term))
      .slice(0, term ? 6 : 8)
      .map<Hit>((e) => ({
        key: `page-${e.label}`,
        label: e.label,
        detail: e.detail,
        group: term ? "Pages and help" : "Go to",
        go: () => {
          if (e.action === "waitlist") return openWaitlist();
          if (e.action === "tour") return window.dispatchEvent(new Event("rk:tour"));
          router.push(e.href!);
        },
      }));
    const mine = term.length >= 2 && found.q === clean(q) ? [...found.roles, ...found.docs] : [];
    const ask: Hit[] =
      signedIn && term
        ? [{ key: "ask", label: `Ask rookie: “${q.trim()}”`, detail: "Opens the assistant", group: "Ask", go: () => window.dispatchEvent(new CustomEvent("rk:ask", { detail: q.trim() })) }]
        : [];
    return [...mine, ...pages, ...ask];
  }, [q, found, signedIn, router]);

  const pick = (h: Hit | undefined) => h && go(h.go)();
  let lastGroup = "";

  return (
    <dialog
      ref={ref}
      className="rk-dialog rk-search outline-none"
      aria-label="Search rookie"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <span className="text-[var(--mute)]">
          <Glass size={20} />
        </span>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(hits.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(hits[active]);
            }
          }}
          placeholder={signedIn ? "Search pages, your roles and documents…" : "Search rookie…"}
          aria-label="Search"
          aria-controls={listId}
          aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
        />
        <kbd className="rounded-md border border-[var(--line2)] px-1.5 py-0.5 text-[11px] text-[var(--mute)]">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
        {hits.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-[var(--mute)]">Nothing found for “{q.trim()}”.</li>}
        {hits.map((h, i) => {
          const head = h.group !== lastGroup ? h.group : null;
          lastGroup = h.group;
          return (
            <li key={h.key} role="none">
              {head && <p className="cap px-3 pt-3 pb-1">{head}</p>}
              <button
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`search-hit ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
              >
                <b className="truncate text-[14.5px]">{h.label}</b>
                <span className="truncate text-[13px] text-[var(--mute)]">{h.detail}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
