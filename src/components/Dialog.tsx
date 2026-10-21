"use client";

import { useEffect, useId, useRef } from "react";

export type DialogAction = { label: string; onClick: () => void; tone?: "primary" | "danger" | "ghost" };

/** A small modal in the Rookie style: title, message, and a row of actions. Escape or the backdrop cancels. */
export default function Dialog({
  open,
  title,
  children,
  actions,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  actions: DialogAction[];
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="rk-dialog outline-none"
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => e.target === ref.current && onCancel()}
      aria-labelledby={titleId}
    >
      <div className="grid gap-3 p-6">
        <h2 id={titleId} className="text-[20px] leading-tight tracking-tight">
          {title}
        </h2>
        {children && <div className="text-[14.5px] leading-relaxed text-[var(--ink2)]">{children}</div>}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`btn !py-2.5 ${a.tone === "danger" ? "btn-danger" : a.tone === "ghost" ? "btn-ghost" : ""}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
