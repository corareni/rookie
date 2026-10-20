import type { Metadata } from "next";
import BarriersBoard from "@/components/BarriersBoard";
import { COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Barriers · Rookie" };

export default async function BarriersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(COLUMNS)
    .in("verdict", ["barrier", "ruled_out", "binned"])
    .eq("status", "interested")
    .order("created_at", { ascending: false });
  return <BarriersBoard initial={(data ?? []) as unknown as Application[]} />;
}
