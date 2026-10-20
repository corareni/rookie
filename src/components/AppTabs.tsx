"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Board" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/barriers", label: "Barriers" },
  { href: "/app/ruled-out", label: "Ruled out" },
];

export default function AppTabs() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/app" ? path === "/app" || path.startsWith("/app/a/") : path === href || path.startsWith(href + "/");
  return (
    <nav aria-label="Sections" className="navpill mb-4 print:hidden">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={active(t.href) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
