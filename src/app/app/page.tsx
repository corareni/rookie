import type { Metadata } from "next";
import Board from "@/components/Board";
import { COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your board · Rookie" };

export default async function AppPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  return <Board initial={(data ?? []) as Application[]} loadError={error?.message ?? null} />;
}
