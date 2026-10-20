"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

export default function Header({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="wrap relative z-10 flex items-center justify-between gap-3 py-4 print:hidden">
      <Link href={email ? "/app" : "/"} className="text-[17px] font-bold tracking-tight no-underline">
        {site.name}
        <span aria-hidden="true">.</span>
      </Link>

      {email ? (
        <nav className="flex min-w-0 items-center gap-1 sm:gap-3">
          <Link href="/app" className="rounded-full px-2 py-1 text-sm font-medium no-underline hover:bg-[var(--card2)]">
            Board
          </Link>
          <Link href="/profile" className="rounded-full px-2 py-1 text-sm font-medium no-underline hover:bg-[var(--card2)]">
            Profile
          </Link>
          <span className="hidden max-w-[180px] truncate text-sm text-[var(--mute)] md:inline">{email}</span>
          <button data-testid="logout" onClick={logout} disabled={busy} className="btn btn-ghost !px-3 !py-1.5 !text-sm">
            Log out
          </button>
        </nav>
      ) : (
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold">
            Log in
          </Link>
          {pathname !== "/" && (
            <Link href="/signup" className="btn !px-4 !py-2 !text-sm">
              Sign up
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
