import type { Metadata } from "next";
import ApplicationsTable from "@/components/ApplicationsTable";
import type { EventFields } from "@/components/EventPanel";
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
  // Calendar fields need the Phase 5 columns; without them the table simply shows no dates.
  const { data: events } = await supabase
    .from("applications")
    .select("id,event_at,event_minutes,event_location,event_kind")
    .not("event_at", "is", null);
  return (
    <ApplicationsTable
      initial={(data ?? []) as unknown as Application[]}
      events={Object.fromEntries((events ?? []).map(({ id, ...e }) => [id, e as EventFields]))}
    />
  );
}
