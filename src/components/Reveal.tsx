"use client";

import { createElement, useEffect, useState } from "react";

/**
 * Fades its content in as it scrolls into view and out again when it leaves.
 * `fade` keeps it to opacity only (no movement). Content is visible without JavaScript.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  fade = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  fade?: boolean;
  as?: "div" | "section" | "li" | "article";
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [state, setState] = useState<"idle" | "in" | "out">("idle");

  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setState(e.isIntersecting ? "in" : "out"), {
      rootMargin: "-6% 0px -6% 0px",
      threshold: 0.08,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);

  // Before the observer runs (server render, no JS) the content stays visible.
  const cls = state === "idle" ? "" : `reveal${fade ? " reveal-fade" : ""}${state === "in" ? " in" : ""}`;
  return createElement(
    Tag,
    { ref: setEl, className: `${cls} ${className}`, style: delay ? ({ "--delay": `${delay}ms` } as React.CSSProperties) : undefined },
    children,
  );
}
