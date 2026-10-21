import type { SupabaseClient } from "@supabase/supabase-js";

const DAY = 86_400_000;

/**
 * Adds reminders for deadlines in the next 3 days and interviews or tests in the next 2 days, each only once
 * (a deleted reminder stays deleted), then returns the bell's list. Runs in the browser with the user's own
 * session, so opening a page never calls rookie's /api routes.
 */
export async function loadNotifications(supabase: SupabaseClient) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const soon = new Date(now + 3 * DAY).toISOString().slice(0, 10);
  const [{ data: due }, { data: events }] = await Promise.all([
    supabase
      .from("applications")
      .select("id,title,company,deadline")
      .eq("status", "interested")
      .neq("verdict", "binned")
      .gte("deadline", today)
      .lte("deadline", soon),
    supabase
      .from("applications")
      .select("id,title,company,event_at,event_kind")
      .gte("event_at", new Date(now).toISOString())
      .lte("event_at", new Date(now + 2 * DAY).toISOString()),
  ]);
  const notes = [
    ...(due ?? []).map((a) => {
      const days = Math.round((Date.parse(a.deadline!) - Date.parse(today)) / DAY);
      return {
        key: `deadline:${a.id}:${a.deadline}`,
        kind: "deadline",
        title: `${a.company ?? a.title} closes ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`,
        body: "Apply before the deadline, or remove it from your board.",
        href: `/app/a/${a.id}`,
        application_id: a.id,
        // Every row in one upsert needs the same fields.
        data: null,
      };
    }),
    ...(events ?? []).map((e) => ({
      key: `event:${e.id}:${e.event_at}`,
      kind: "event",
      title: `${e.event_kind === "assessment" ? "Assessment" : e.event_kind === "other" ? "Next step" : "Interview"} with ${e.company ?? e.title} soon`,
      body: "Practise your questions on the role page.",
      href: `/app/a/${e.id}#interview`,
      application_id: e.id,
      // Shown in the user's own time zone by the bell.
      data: { at: e.event_at },
    })),
  ];
  if (notes.length) await supabase.from("notifications").upsert(notes, { onConflict: "user_id,key", ignoreDuplicates: true });

  const { data, error } = await supabase
    .from("notifications")
    .select("id,kind,title,body,href,application_id,data,read_at,created_at")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(40);
  return { ready: !error, items: data ?? [] };
}
