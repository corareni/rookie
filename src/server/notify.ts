import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Note = {
  /** Unique per event, so the same update is never created twice (and stays deleted once deleted). */
  key: string;
  kind: "analysed" | "score" | "deadline" | "event" | "email" | "profile";
  title: string;
  body?: string;
  href?: string;
  application_id?: string | null;
  data?: unknown;
};

/** Adds notifications for the signed-in user. Never throws: a missing table (before phase 6) just means no bell. */
export async function notify(supabase: SupabaseClient, notes: Note | Note[]) {
  const list = (Array.isArray(notes) ? notes : [notes]).map((n) => ({
    key: n.key.slice(0, 300),
    kind: n.kind,
    title: n.title.slice(0, 200),
    body: (n.body ?? "").slice(0, 600),
    href: n.href ?? null,
    application_id: n.application_id ?? null,
    data: n.data ?? null,
  }));
  if (!list.length) return;
  try {
    await supabase.from("notifications").upsert(list, { onConflict: "user_id,key", ignoreDuplicates: true });
  } catch {
    // ignore
  }
}
