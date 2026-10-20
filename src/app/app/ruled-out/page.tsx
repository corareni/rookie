import type { Metadata } from "next";
import VerdictList from "@/components/VerdictList";
import { COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ruled out · Rookie" };

export default async function RuledOutPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(COLUMNS)
    .eq("verdict", "ruled_out")
    .eq("status", "interested")
    .order("created_at", { ascending: false });
  return (
    <VerdictList
      initial={(data ?? []) as unknown as Application[]}
      label="Ruled out"
      title="Ruled"
      em="out."
      intro="Roles that broke one of your hard rules or whose deadline has passed. Disagree? Move them back to the board."
    />
  );
}
