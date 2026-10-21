"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { compareRoles } from "@/lib/ai-client";

export type CompareState =
  | { state: "working"; names: string[] }
  | { state: "done"; names: string[]; id: string }
  | { state: "error"; names: string[]; msg: string };

const list = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]);

/** Floating pop-up while roles are compared in the background; links to the result when it's ready. */
export default function CompareToast({ toast, onClose }: { toast: CompareState; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rk-toast ${toast.state !== "working" ? "done" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1.5">
          {toast.state === "working" && (
            <>
              <span className="rk-dots" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              <b className="text-[15px]">Comparing your roles…</b>
              <span className="text-[13px] text-[var(--onblack2)]">
                {list(toast.names)}. Keep browsing, this takes about half a minute.
              </span>
            </>
          )}
          {toast.state === "done" && (
            <>
              <b className="text-[15px]">
                <span aria-hidden="true">✓ </span>Your comparison is ready
              </b>
              <span className="text-[13px] text-[var(--onblack2)]">{list(toast.names)}</span>
              <Link
                href={`/app/compare/${toast.id}`}
                className="act mt-1 justify-self-start !bg-[var(--mint)] !px-4 no-underline"
                onClick={onClose}
              >
                View comparison →
              </Link>
            </>
          )}
          {toast.state === "error" && (
            <>
              <b className="text-[15px]">Couldn&apos;t compare</b>
              <span className="text-[13px] text-[var(--onblack2)]">{toast.msg}</span>
            </>
          )}
        </div>
        {toast.state !== "working" && (
          <button type="button" aria-label="Close" className="text-[18px] leading-none text-[var(--onblack2)] hover:text-white" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const Ctx = createContext<{ start: (ids: string[], names: string[]) => void; busy: boolean }>({ start: () => {}, busy: false });

export const useCompare = () => useContext(Ctx);

/** Lives in the /app layout, so a comparison keeps running (and its pop-up stays) while you move between pages. */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<CompareState | null>(null);

  async function start(ids: string[], names: string[]) {
    setToast({ state: "working", names });
    try {
      const id = await compareRoles(ids);
      setToast({ state: "done", names, id });
    } catch (e) {
      setToast({ state: "error", names, msg: e instanceof Error ? e.message : "Couldn't compare these roles." });
    }
  }

  return (
    <Ctx.Provider value={{ start, busy: toast?.state === "working" }}>
      {children}
      {toast && <CompareToast toast={toast} onClose={() => setToast(null)} />}
    </Ctx.Provider>
  );
}
