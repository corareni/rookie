"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const APP_NAV = [
  { href: "/app", label: "Board" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/barriers", label: "Barriers" },
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

export default function Header({ email, name }: { email: string | null; name: string | null }) {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const nav = email ? APP_NAV : SITE_NAV;
  const who = name ? displayName(name) : email;
  const active = (href: string) =>
    href === "/app"
      ? path === "/app" || path.startsWith("/app/a/")
      : !href.includes("#") && (path === href || path.startsWith(href + "/"));

  // Past the top of the page the bar shrinks into a small centred pill; back at the top it expands again.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const down = window.scrollY > 90;
        setCompact((was) => {
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

  async function logout() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.assign("/");
  }

  // Only one visible Log out button carries the test id at any time.
  const authButtons = (primary: boolean) =>
    email ? (
    <button data-testid={primary ? "logout" : undefined} onClick={logout} disabled={busy} className="pillbtn pillbtn-dark">
      Log out
    </button>
  ) : (
    <>
      <Link href="/login" className={`pillbtn pillbtn-dark ${primary ? "max-sm:hidden" : ""}`}>
        Log in
      </Link>
      <Link href="/signup" className="pillbtn pillbtn-mint">
        Sign up
      </Link>
    </>
    );

  return (
    <div className="sticky top-2 z-40 flex justify-center print:hidden">
      <header className={`topbar transition-all duration-500 ease-out ${compact ? "topbar-compact" : "w-full"}`}>
        <Link href={email ? "/app" : "/"} className="flex flex-none items-center no-underline" aria-label="Rookie home">
          <Wordmark className="text-[22px] leading-none sm:text-[24px]" />
        </Link>

        {compact ? (
          <button
            type="button"
            className="pillbtn pillbtn-dark !px-4"
            aria-expanded={open}
            aria-controls="compact-menu"
            onClick={() => setOpen((o) => !o)}
          >
            Menu <span aria-hidden="true">{open ? "×" : "≡"}</span>
          </button>
        ) : (
          <>
            <nav aria-label="Main" className="topnav mx-auto max-sm:hidden">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-none items-center gap-2">
              {email && (
                <span className="hidden max-w-[200px] truncate text-[13.5px] text-[var(--onblack2)] lg:inline" title={email}>
                  {who}
                </span>
              )}
              <button
                type="button"
                className="pillbtn pillbtn-dark !px-3.5 sm:hidden"
                aria-expanded={open}
                aria-controls="compact-menu"
                onClick={() => setOpen((o) => !o)}
              >
                Menu <span aria-hidden="true">{open ? "×" : "≡"}</span>
              </button>
              {authButtons(true)}
            </div>
          </>
        )}
      </header>

      {open && (
        <div id="compact-menu" className="menu-panel absolute top-[calc(100%+8px)] w-[min(420px,calc(100vw-32px))]">
          <nav aria-label="Main" className="grid gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className="menu-link" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            {email && <span className="truncate text-[13px] text-[var(--onblack2)]">{who}</span>}
            <span className="flex gap-2">{authButtons(compact)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
