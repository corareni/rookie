import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError } from "./gemini";
import type { Profile } from "./prompts";

export type Kind = "analyze" | "compare" | "generate";
export const DAILY: Record<Kind, number> = { analyze: 20, compare: 5, generate: 6 };

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

export async function usedToday(supabase: SupabaseClient, kind: Kind) {
  const { count } = await supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", startOfDay());
  return count ?? 0;
}

/** Throws if the user or the whole app is over today's limit, otherwise logs the run. */
export async function useRun(supabase: SupabaseClient, kind: Kind, cost = 1) {
  if ((await usedToday(supabase, kind)) + cost > DAILY[kind]) {
    throw new AiError(`You've used today's ${kind === "generate" ? "document" : kind} limit. Back tomorrow.`, 429);
  }
  const globalCap = Number(process.env.AI_GLOBAL_DAILY_LIMIT || 400);
  const { data: total } = await supabase.rpc("ai_runs_today_global");
  if (Number(total ?? 0) + cost > globalCap) throw new AiError("Rookie has hit today's AI limit. Back tomorrow.", 429);
  await supabase.from("ai_runs").insert(Array.from({ length: cost }, () => ({ kind })));
}

export async function getUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AiError("Please log in.", 401);
  return user;
}

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("cv_text,story,rules,writing_notes,contact").maybeSingle();
  return (data as Profile | null) ?? null;
}

export function errorResponse(e: unknown) {
  const err = e instanceof AiError ? e : new AiError("Something went wrong. Try again.");
  if (!(e instanceof AiError)) console.error(e);
  return Response.json({ error: err.message }, { status: err.status });
}
