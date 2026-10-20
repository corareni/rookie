"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Deletes a saved comparison after a confirm; on its own page it returns to the overview. */
export default function DeleteComparison({ id, goBack = false }: { id: string; goBack?: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const { error } = await createClient().from("comparisons").delete().eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    if (goBack) router.push("/app/compare");
    router.refresh();
  }

  if (!confirm)
    return (
      <button type="button" className="act !text-[var(--bad)]" onClick={() => setConfirm(true)}>
        Delete
      </button>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-danger !py-2 !text-[13px]" disabled={busy} onClick={remove}>
        {busy ? "Deleting…" : "Delete comparison"}
      </button>
      <button type="button" className="btn btn-ghost !py-2 !text-[13px]" onClick={() => setConfirm(false)}>
        Keep
      </button>
      {error && (
        <span role="alert" className="text-[13px] text-[var(--bad)]">
          {error}
        </span>
      )}
    </span>
  );
}
