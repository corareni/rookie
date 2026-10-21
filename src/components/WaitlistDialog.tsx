"use client";

import { useEffect, useRef, useState } from "react";
import Waitlist, { type WaitlistEntry } from "@/components/Waitlist";
import { createClient } from "@/lib/supabase/client";

const OPEN = "rk:waitlist";

/** Opens the waiting-list pop-up from anywhere (the header button and menu item). */
export const openWaitlist = () => window.dispatchEvent(new Event(OPEN));

/** The waiting list as a pop-up, loaded fresh each time it opens. Lives in the header, so it works on every page. */
export default function WaitlistDialog({ signedIn }: { signedIn: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ entry: WaitlistEntry | null; ready: boolean } | null>(null);

  useEffect(() => {
    const show = async () => {
      setOpen(true);
      if (!signedIn) return setData({ entry: null, ready: true });
      setData(null);
      const { data: row, error } = await createClient().from("waitlist").select("plan,wants,note,created_at").maybeSingle();
      setData({ entry: (row as WaitlistEntry | null) ?? null, ready: !error });
    };
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, [signedIn]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="rk-dialog rk-dialog-waitlist outline-none"
      aria-label="Waiting list"
      onCancel={(e) => {
        e.preventDefault();
        setOpen(false);
      }}
      onClick={(e) => e.target === ref.current && setOpen(false)}
    >
      {open &&
        (data ? (
          <Waitlist
            key={data.entry?.created_at ?? "new"}
            initial={data.entry}
            ready={data.ready}
            signedIn={signedIn}
            variant="dialog"
            onClose={() => setOpen(false)}
          />
        ) : (
          <p className="p-9 text-[15px] font-bold" role="status">
            Loading…
          </p>
        ))}
    </dialog>
  );
}
