"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_me");
    if (error) {
      setError(`Couldn't delete your account: ${error.message}`);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost mt-4 !text-[var(--bad)]" onClick={() => setConfirming(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Are you sure? Everything will be deleted.</span>
      <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
        {busy ? "Deleting…" : "Yes, delete everything"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </button>
      {error && (
        <p role="alert" className="alert w-full">
          {error}
        </p>
      )}
    </div>
  );
}
