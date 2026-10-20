import type { Metadata } from "next";
import Board from "@/components/Board";
import { COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your board · Rookie" };

export default async function AppPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.from("applications").select(COLUMNS).order("created_at", { ascending: false }),
    supabase.from("profiles").select("cv_text").maybeSingle(),
  ]);

  return (
    <Board
      initial={(data ?? []) as unknown as Application[]}
      loadError={error?.message ?? null}
      hasProfile={!!profile?.cv_text?.trim()}
    />
  );
}
