"use client";

import { useRef, useState } from "react";

/**
 * "Slide to save": a black pill with the Save button on the left. On hover it widens to show a short note;
 * clicking slides the button to the right (it shrinks into a ✓ on the way) and saves. The button can also be
 * dragged to the right by hand: past ~60% it saves, otherwise it springs back.
 */
export default function SlideToSave({
  label = "Save profile",
  note,
  status,
  error = false,
  onSave,
}: {
  label?: string;
  /** Shown when the pill widens (hover or focus). */
  note: string;
  /** Unsaved, saved or error text: keeps the pill open while it's there. */
  status?: string | null;
  error?: boolean;
  onSave: () => Promise<boolean>;
}) {
  const pill = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const [x, setX] = useState(0);
  const [phase, setPhase] = useState<"idle" | "dragging" | "sliding" | "saving" | "done">("idle");
  const [open, setOpen] = useState(false);

  /** How far the button can travel: to the right end of the widened pill. */
  const room = () => {
    const p = pill.current;
    const h = handle.current;
    if (!p || !h) return 0;
    return Math.max(0, p.clientWidth - 48 - 10);
  };

  async function commit() {
    if (phase === "saving" || phase === "sliding") return;
    setOpen(true);
    setPhase("sliding");
    // Let the pill finish widening, then slide all the way and shrink into a ✓.
    await new Promise((r) => setTimeout(r, 260));
    setX(room());
    setPhase("saving");
    const ok = await onSave();
    setPhase(ok ? "done" : "idle");
    setTimeout(
      () => {
        setX(0);
        setPhase("idle");
        setOpen(false);
      },
      ok ? 1400 : 300,
    );
  }

  const shrunk = phase === "saving" || phase === "done" || (phase === "dragging" && x > 24);
  const expanded = open || phase !== "idle" || !!status;

  return (
    <div
      ref={pill}
      className={`slide-save ${expanded ? "is-open" : ""} ${error ? "is-error" : ""}`}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => phase === "idle" && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => phase === "idle" && setOpen(false)}
    >
      <span className="slide-save-note" role={error ? "alert" : "status"}>
        {phase === "saving" ? "Saving…" : phase === "done" ? "Saved." : (status ?? note)}
      </span>
      <button
        ref={handle}
        type="button"
        className={`slide-save-handle ${shrunk ? "is-small" : ""} ${phase === "dragging" ? "is-dragging" : ""}`}
        style={{ transform: `translateX(${x}px)` }}
        aria-label={label}
        onPointerDown={(e) => {
          if (phase !== "idle") return;
          setOpen(true);
          drag.current = { x: e.clientX, start: x, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) < 5) return;
          d.moved = true;
          setPhase("dragging");
          setX(Math.min(room(), Math.max(0, d.start + dx)));
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (!d.moved) return void commit();
          // Far enough: finish the slide and save. Otherwise spring back.
          if (x > room() * 0.6) void commit();
          else {
            setX(0);
            setPhase("idle");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void commit();
          }
        }}
      >
        <span className="slide-save-label">{label}</span>
        <svg className="slide-save-tick" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </button>
    </div>
  );
}
