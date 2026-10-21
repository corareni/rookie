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
  // Roles whose stage was set from an email (still at that stage), for the "From an email" label.
  const { data: fromMail } = await supabase
    .from("notifications")
    .select("application_id,created_at,body,data")
    .eq("kind", "email")
    .order("created_at", { ascending: false })
    .limit(100);
  const fromEmail: Record<string, { at: string; summary: string; status: string }> = {};
  for (const n of fromMail ?? []) {
    const d = n.data as { applied?: boolean; suggestion?: { status?: string; summary?: string } } | null;
    if (!n.application_id || !d?.applied || fromEmail[n.application_id]) continue;
    fromEmail[n.application_id] = { at: n.created_at, summary: d.suggestion?.summary ?? "", status: d.suggestion?.status ?? "" };
  }

  return (
    <ApplicationsTable
      fromEmail={fromEmail}
      initial={(data ?? []) as unknown as Application[]}
      events={Object.fromEntries((events ?? []).map(({ id, ...e }) => [id, e as EventFields]))}
      readEmails={readsEmails(prof ? toProfileData(prof) : null)}
      gmail={typeof (await searchParams).gmail === "string" ? ((await searchParams).gmail as string) : null}
    />
  );
}
