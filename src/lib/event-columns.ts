/** The calendar fields on a role. `event_note` (the name of an "Other" event) needs the phase 6 database update. */
export const EVENT_COLUMNS = "event_at,event_minutes,event_location,event_kind";

export type EventRow = {
  id: string;
  event_at: string | null;
  event_minutes: number;
  event_location: string | null;
  event_kind: "interview" | "assessment" | "other" | null;
  event_note?: string | null;
};

/** Runs a query with the note column, or without it if the database doesn't have it yet. */
export async function withEventNote<T = EventRow[]>(
  run: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ data: T | null; error: unknown }> {
  const r = await run(`${EVENT_COLUMNS},event_note`);
  const out = r.error ? await run(EVENT_COLUMNS) : r;
  return { data: (out.data as T) ?? null, error: out.error };
}
