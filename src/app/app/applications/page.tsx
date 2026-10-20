import type { Metadata } from "next";
import ApplicationsTable from "@/components/ApplicationsTable";
import { APPLIED_STATUSES, COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Applications · Rookie" };

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(COLUMNS)
    .in("status", APPLIED_STATUSES)
    .order("submitted_on", { ascending: false, nullsFirst: false });
  return <ApplicationsTable initial={(data ?? []) as unknown as Application[]} />;
}
