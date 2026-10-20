"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

const APP_NAV = [
  { href: "/app", label: "Board" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/barriers", label: "Barriers" },
  { href: "/profile", label: "Profile" },
];

const SITE_NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#numbers", label: "The numbers" },
  { href: "/privacy", label: "Privacy" },
];

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Header({ email }: { email: string | null }) {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const nav = email ? APP_NAV : SITE_NAV;
  const active = (href: string) =>
    href === "/app"
      ? path === "/app" || path.startsWith("/app/a/")
      : !href.includes("#") && (path === href || path.startsWith(href + "/"));

  async function logout() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="topbar print:hidden">
      <Link href={email ? "/app" : "/"} className="flex flex-none items-center gap-2 no-underline">
        <Mark />
        <span className="text-[19px] font-bold tracking-tight max-[420px]:sr-only">{site.name}</span>
      </Link>

      <nav aria-label="Main" className="topnav mx-auto">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-none items-center gap-2">
        {email ? (
          <>
            <span className="hidden max-w-[180px] truncate text-[13px] text-[var(--onblack2)] xl:inline">{email}</span>
            <button data-testid="logout" onClick={logout} disabled={busy} className="pillbtn pillbtn-dark">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="pillbtn pillbtn-dark max-sm:hidden">
              Log in
            </Link>
            <Link href="/signup" className="pillbtn pillbtn-mint">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
