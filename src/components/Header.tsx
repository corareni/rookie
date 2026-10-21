"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import NotificationBell from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";

const APP_NAV = [
  { href: "/app", label: "Board" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/barriers", label: "Barriers" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/library", label: "Library" },
  { href: "/profile", label: "Profile" },
];

const SITE_NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#numbers", label: "The numbers" },
  { href: "/privacy", label: "Privacy" },
];

/** Names imported from a CV are often in capitals; show them as "Coralie Affeld". */
const displayName = (n: string) =>
  n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()) : n;

export function Wordmark({ className = "", dot = "text-[var(--lilac)]" }: { className?: string; dot?: string }) {
  return (
    <span className={`font-bold tracking-[-0.04em] ${className}`}>
      rookie<span className={dot}>.</span>
    </span>
  );
}

const PHONE = "(max-width: 639px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export default function Header({
  email,
  name,
  readEmails = true,
}: {
  email: string | null;
  name: string | null;
  /** Off when the user switched off email reading on their Profile. */
  readEmails?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const phone = useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false);
  const nav = email ? APP_NAV : SITE_NAV;
  const who = name ? displayName(name) : null;
  const active = (href: string) =>
    href === "/app"
      ? path === "/app" || path.startsWith("/app/a/")
      : !href.includes("#") && (path === href || path.startsWith(href + "/"));

  // The purple pill slides to the section you click straight away, before the page has loaded.
  const [pending, setPending] = useState<string | null>(null);
  const [seenPath, setSeenPath] = useState(path);
  if (path !== seenPath) {
    setSeenPath(path);
    setPending(null);
  }
  const selected = pending ?? nav.find((n) => active(n.href))?.href ?? null;
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; on: boolean; moved: boolean } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLElement>(`a[data-href="${selected}"]`);
      setPill((p) => (el ? { left: el.offsetLeft, width: el.offsetWidth, on: true, moved: !!p?.on } : p ? { ...p, on: false } : null));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selected, scrolled, phone]);

  // The same sliding pill in the compact menu, moving up and down.
  const menuRef = useRef<HTMLElement>(null);
  const [menuPill, setMenuPill] = useState<{ top: number; height: number; moved: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = menuRef.current?.querySelector<HTMLElement>(`a[data-href="${selected}"]`);
    setMenuPill((p) => (el ? { top: el.offsetTop, height: el.offsetHeight, moved: !!p } : null));
  }, [selected, open, scrolled, phone]);

  // One bar that morphs: past the top it narrows into a centred pill; back at the top it widens again.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const down = window.scrollY > 90;
        setScrolled((was) => {
          if (was !== down) setOpen(false);
          return down;
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // On a laptop the full bar shows every section; the menu only exists once it has shrunk.
  // On a phone the sections don't fit, so the bar is always the compact pill with a menu.
  const compact = scrolled || phone;
  const keepAuth = phone; // on phones Log out / Sign up stay in the pill

  async function logout() {
    setBusy(true);
    const auth = createClient().auth;
    // End the session on the server, but never keep the user waiting: if that's slow, sign out in this
    // browser (clears the session cookies) and leave anyway.
    const done = await Promise.race([auth.signOut().then(() => true), new Promise<false>((r) => setTimeout(() => r(false), 2000))]);
    if (!done) await auth.signOut({ scope: "local" });
    try {
      // Chat history is kept per user in this browser; don't leave it behind on a shared computer.
      Object.keys(localStorage)
        .filter((k) => k.startsWith("rookie-chats"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    window.location.assign("/");
  }

  const auth = (withId: boolean) =>
    email ? (
      <button data-testid={withId ? "logout" : undefined} onClick={logout} disabled={busy} className="pillbtn pillbtn-dark">
        Log out
      </button>
    ) : (
      <>
        {!phone && (
          <Link href="/login" className="pillbtn pillbtn-dark">
            Log in
          </Link>
        )}
        <Link href="/signup" className="pillbtn pillbtn-mint">
          Sign up
        </Link>
      </>
    );

  return (
    <div className="sticky top-2 z-50 flex justify-center print:hidden">
      <header className={`topbar morph ${scrolled ? "is-scrolled" : ""} ${compact ? "is-compact" : ""} ${email ? "has-bell" : ""}`}>
        <Link href={email ? "/app" : "/"} className="flex flex-none items-center no-underline" aria-label="rookie home">
          <Wordmark className="text-[22px] leading-none sm:text-[24px]" />
        </Link>

        <nav ref={navRef} aria-label="Main" className="topnav has-pill morph-part ml-auto" inert={compact}>
          {pill && (
            <span
              aria-hidden="true"
              className={`topnav-pill ${pill.moved ? "is-moving" : ""}`}
              style={{ transform: `translateX(${pill.left}px)`, width: pill.width, opacity: pill.on ? 1 : 0 }}
            />
          )}
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-href={n.href}
              data-on={selected === n.href ? "" : undefined}
              aria-current={active(n.href) ? "page" : undefined}
              onClick={() => !n.href.includes("#") && setPending(n.href)}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className={`ml-auto flex flex-none items-center gap-2 ${keepAuth ? "" : "morph-part"}`} inert={compact && !keepAuth}>
          {who && !phone && (
            <span className="max-w-[160px] truncate text-[13.5px] text-[var(--onblack2)] max-lg:hidden">{who}</span>
          )}
          {auth(true)}
        </div>

        {/* Always visible when signed in, in the full bar and the compact pill. */}
        {email && <NotificationBell readEmails={readEmails} />}

        <button
          type="button"
          className="pillbtn pillbtn-dark menu-btn"
          aria-expanded={open}
          aria-controls="compact-menu"
          inert={!compact}
          onClick={() => setOpen((o) => !o)}
        >
          {/* On phones the pill is tight, so the menu button is just the icon. */}
          <span className="max-sm:sr-only">Menu</span>
          {/* Two lines that swing from "=" into "×" and back. */}
          <span className={`menu-icon ${open ? "is-open" : ""}`} aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </header>

      {/* Always there in the compact header, so it can glide open and closed. */}
      {compact && (
        <div
          id="compact-menu"
          className={`menu-panel absolute top-[calc(100%+8px)] w-[min(420px,calc(100vw-32px))] ${open ? "is-open" : ""}`}
          inert={!open}
        >
          <nav ref={menuRef} aria-label="Main" className="relative grid gap-1">
            {menuPill && (
              <span
                aria-hidden="true"
                className={`menu-pill ${menuPill.moved ? "is-moving" : ""}`}
                style={{ transform: `translateY(${menuPill.top}px)`, height: menuPill.height }}
              />
            )}
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                data-href={n.href}
                data-on={selected === n.href ? "" : undefined}
                aria-current={active(n.href) ? "page" : undefined}
                className="menu-link"
                onClick={(e) => {
                  if (n.href.includes("#") || e.metaKey || e.ctrlKey || e.shiftKey) return setOpen(false);
                  // Let the pill glide to it first, then change page and let the menu close.
                  e.preventDefault();
                  setPending(n.href);
                  setTimeout(() => {
                    router.push(n.href);
                    setOpen(false);
                  }, 260);
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {!keepAuth && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              {who && <span className="truncate text-[13px] text-[var(--onblack2)]">{who}</span>}
              <span className="flex gap-2">{auth(false)}</span>
            </div>
          )}
          {keepAuth && who && <p className="mt-3 border-t border-white/10 px-3 pt-3 text-[13px] text-[var(--onblack2)]">{who}</p>}
        </div>
      )}
    </div>
  );
}
