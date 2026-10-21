import type { Metadata } from "next";
import Board from "@/components/Board";
import { COLUMNS, type Application } from "@/lib/applications";
import { PROFILE_COLUMNS, profileComplete, toProfileData } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your board · Rookie" };

export default async function AppPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.from("applications").select(COLUMNS).order("created_at", { ascending: false }),
    supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle(),
  ]);

  return (
    <Board
      initial={(data ?? []) as unknown as Application[]}
      loadError={error?.message ?? null}
      hasProfile={!!profile && profileComplete(toProfileData(profile))}
    />
  );
}
