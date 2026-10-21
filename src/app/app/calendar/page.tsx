import type { Metadata } from "next";
import CalendarView, { type CalItem } from "@/components/CalendarView";
import { withEventNote } from "@/lib/event-columns";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calendar · Rookie" };

type Row = {
  id: string;
  title: string;
  company: string | null;
  role: string | null;
  status: string;
  deadline: string | null;
  submitted_on: string | null;
  assessment_on: string | null;
  interview_on: string | null;
  offer_on: string | null;
  job_url: string | null;
  next_step: string | null;
  location: string | null;
};

export default async function CalendarPage() {
  const supabase = await createClient();
  const [{ data }, events] = await Promise.all([
    supabase
      .from("applications")
      .select("id,title,company,role,status,deadline,submitted_on,assessment_on,interview_on,offer_on,job_url,next_step,location,verdict")
      .neq("verdict", "binned"),
    // Scheduled interviews and tests need the Phase 5 columns; without them this is simply empty.
    withEventNote((c) => supabase.from("applications").select(`id,${c}`).not("event_at", "is", null)),
  ]);

  const items: CalItem[] = [];
  for (const a of (data ?? []) as Row[]) {
    const base = {
      appId: a.id,
      company: a.company ?? a.title,
      role: a.role,
      job_url: a.job_url,
      next_step: a.next_step,
      place: a.location,
      status: a.status,
    };
    if (a.submitted_on) items.push({ ...base, kind: "applied", day: a.submitted_on });
    if (a.assessment_on) items.push({ ...base, kind: "assessment", day: a.assessment_on });
    if (a.interview_on) items.push({ ...base, kind: "interview", day: a.interview_on });
    if (a.offer_on) items.push({ ...base, kind: "offer", day: a.offer_on });
    if (a.deadline && a.status === "interested") items.push({ ...base, kind: "deadline", day: a.deadline });
  }
  for (const e of events.data ?? []) {
    const a = (data as Row[] | null)?.find((x) => x.id === e.id);
    if (!a) continue;
    items.push({
      appId: a.id,
      company: a.company ?? a.title,
      role: a.role,
      job_url: a.job_url,
      next_step: a.next_step,
      place: a.location,
      status: a.status,
      kind: "scheduled",
      at: e.event_at as string,
      minutes: e.event_minutes as number,
      location: e.event_location as string | null,
      eventKind: e.event_kind as "interview" | "assessment" | "other" | null,
      eventNote: ((e as { event_note?: string | null }).event_note ?? null) || null,
    });
  }

  const roles = ((data ?? []) as Row[])
    .map((a) => ({ id: a.id, name: [a.company ?? a.title, a.role].filter(Boolean).join(" · ") }))
    .sort((x, y) => x.name.localeCompare(y.name));

  return <CalendarView items={items} roles={roles} />;
}
