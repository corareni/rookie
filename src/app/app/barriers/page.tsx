import type { Metadata } from "next";
import VerdictList from "@/components/VerdictList";
import { COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Barriers · Rookie" };

export default async function BarriersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(COLUMNS)
    .eq("verdict", "barrier")
    .eq("status", "interested")
    .order("created_at", { ascending: false });
  return (
    <VerdictList
      initial={(data ?? []) as unknown as Application[]}
      label="Barriers"
      title="Maybe"
      em="not."
      intro="Roles with a possible barrier: unclear duration or on-site time, unclear sponsorship, a graduation-year rule or a start date that may clash with your hard rules. Your call."
    />
  );
}
