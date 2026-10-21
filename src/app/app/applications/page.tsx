import type { Metadata } from "next";
import ApplicationsTable from "@/components/ApplicationsTable";
import type { EventFields } from "@/components/EventPanel";
import { APPLIED_STATUSES, COLUMNS, type Application } from "@/lib/applications";
import { withEventNote } from "@/lib/event-columns";
import { PROFILE_COLUMNS, readsEmails, toProfileData } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Applications · rookie" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/app/applications">) {
  const supabase = await createClient();
  const { data: prof } = await supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle();
  const { data } = await supabase
    .from("applications")
    .select(COLUMNS)
    .in("status", APPLIED_STATUSES)
    .order("submitted_on", { ascending: false, nullsFirst: false });
  // Calendar fields need the Phase 5 columns; without them the table simply shows no dates.
  const { data: events } = await withEventNote((c) =>
    supabase.from("applications").select(`id,${c}`).not("event_at", "is", null),
  );
  return (
    <ApplicationsTable
      initial={(data ?? []) as unknown as Application[]}
      events={Object.fromEntries((events ?? []).map(({ id, ...e }) => [id, e as EventFields]))}
      readEmails={readsEmails(prof ? toProfileData(prof) : null)}
      gmail={typeof (await searchParams).gmail === "string" ? ((await searchParams).gmail as string) : null}
    />
  );
}
