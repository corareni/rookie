import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiError } from "./gemini";
import { PROFILE_COLUMNS, toProfileData } from "@/lib/profile";
import { KIND_LABEL, LIMITS, PLAN_LABEL, isPlan, raiseHint, type Kind, type Plan } from "@/lib/plans";
import type { Profile } from "./prompts";

export type { Kind };

/** A limit was reached (429) or the plan doesn't include this (403). The client shows it in a toast. */
export class LimitError extends AiError {
  constructor(
    message: string,
    status: number,
    public title: string,
    public upgrade = false,
  ) {
    super(message, status);
  }
}

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};
const startOfMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};
/** "1 November": when this month's limits start again. */
export const monthResets = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
};

/**
 * The user's plan; Free until a row says otherwise. Plans live in `user_plans` (schema-phase8.sql), which users can
 * read but never write, so nobody can upgrade themselves. Before that table exists, everyone is on Free.
 */
export async function getPlan(supabase: SupabaseClient): Promise<Plan> {
  const { data, error } = await supabase.from("user_plans").select("plan").maybeSingle();
  return !error && isPlan(data?.plan) ? data.plan : "free";
}

async function countSince(supabase: SupabaseClient, kind: Kind, since: string) {
  const { count } = await supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", since);
  return count ?? 0;
}

/** This user's runs of one kind today and this calendar month (UTC). */
export async function usage(supabase: SupabaseClient, kind: Kind) {
  const [day, month] = await Promise.all([countSince(supabase, kind, startOfDay()), countSince(supabase, kind, startOfMonth())]);
  return { day, month };
}

/** Every kind's runs today and this month in one query, for the usage meter on the Profile page. */
export async function monthUsage(supabase: SupabaseClient) {
  const { data } = await supabase.from("ai_runs").select("kind,created_at").gte("created_at", startOfMonth()).limit(5000);
  const day = startOfDay();
  const out = {} as Record<Kind, { day: number; month: number }>;
  for (const k of Object.keys(LIMITS.free) as Kind[]) out[k] = { day: 0, month: 0 };
  for (const r of (data ?? []) as { kind: Kind; created_at: string }[]) {
    if (!out[r.kind]) continue;
    out[r.kind].month++;
    if (r.created_at >= day) out[r.kind].day++;
  }
  return out;
}

/** Throws if the plan doesn't include this kind at all. */
export function requirePlan(plan: Plan, kind: Kind) {
  if (LIMITS[plan][kind].month > 0) return;
  const what = KIND_LABEL[kind][1];
  const who = LIMITS.basic[kind].month > 0 ? "Basic and Premium" : "Premium";
  throw new LimitError(
    `${what[0].toUpperCase()}${what.slice(1)} come with ${who}. You're on ${PLAN_LABEL[plan]}; your board, calendar and library stay free.`,
    403,
    `Part of ${who}`,
    true,
  );
}

/** What ran out and when it comes back, or null if this run fits the plan. */
async function overLimit(supabase: SupabaseClient, plan: Plan, kind: Kind, cost: number) {
  const limit = LIMITS[plan][kind];
  const used = await usage(supabase, kind);
  const [one, many] = KIND_LABEL[kind];
  const n = (x: number) => `${x} ${x === 1 ? one : many}`;
  if (used.month + cost > limit.month)
    return { used: `You've used this month's ${n(limit.month)} on ${PLAN_LABEL[plan]}`, resets: `They reset on ${monthResets()}.` };
  if (used.day + cost > limit.day)
    return { used: `You've used today's ${n(limit.day)} on ${PLAN_LABEL[plan]}`, resets: "More tomorrow (from midnight UTC)." };
  return null;
}

/** Rough AI cost of one run in euros (Handover/pricing-scenarios.md, 2027 Gemini prices plus retries). */
const COST_EUR: Record<Kind, number> = {
  analyze: 0.007,
  rescore: 0.006,
  generate: 0.047,
  chat: 0.0045,
  deep: 0.018,
  interview: 0.023,
  compare: 0.028,
  // One Gmail check reads up to 12 roles plus new applications.
  email: 0.05,
  import: 0.01,
  library: 0.005,
};

/**
 * Today's estimated AI spend across all users. Uses the per-kind counts from schema-phase8.sql; before that runs,
 * the old total count at a cautious average price.
 */
async function spentToday(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("ai_runs_today_by_kind");
  if (!error && Array.isArray(data))
    return (data as { kind: Kind; runs: number }[]).reduce((sum, r) => sum + Number(r.runs) * (COST_EUR[r.kind] ?? 0.05), 0);
  const { data: total } = await supabase.rpc("ai_runs_today_global");
  return Number(total ?? 0) * 0.03;
}

/** The whole app's daily AI budget in euros: AI_DAILY_BUDGET_EUR, default €25 (about 800 average runs, up from 400). */
async function checkBudget(supabase: SupabaseClient, kind: Kind, cost: number) {
  const budget = Number(process.env.AI_DAILY_BUDGET_EUR) || 25;
  if ((await spentToday(supabase)) + COST_EUR[kind] * cost > budget) throw new AiError("rookie has hit today's AI limit. Back tomorrow.", 429);
}

const log = (supabase: SupabaseClient, kind: Kind, cost: number) => supabase.from("ai_runs").insert(Array.from({ length: cost }, () => ({ kind })));

/** Throws if the user's plan, or the whole app's budget, is over the limit; otherwise logs the run. */
export async function consumeRun(supabase: SupabaseClient, kind: Kind, cost = 1, plan?: Plan) {
  plan ??= await getPlan(supabase);
  requirePlan(plan, kind);
  const over = await overLimit(supabase, plan, kind, cost);
  if (over) throw new LimitError(`${over.used}. ${over.resets} ${raiseHint(plan)}`, 429, "Limit reached", true);
  await checkBudget(supabase, kind, cost);
  await log(supabase, kind, cost);
}

/**
 * One deep answer (smarter model) if the plan has one left; otherwise says why, so the assistant falls back to the
 * quick model instead of refusing. Never throws for limits.
 */
export async function tryDeep(supabase: SupabaseClient, plan: Plan): Promise<string | null> {
  if (LIMITS[plan].deep.month === 0) return "Deep answers come with Basic and Premium, so this one used the quick model.";
  const over = await overLimit(supabase, plan, "deep", 1);
  if (over) return `${over.used}, so this one used the quick model. ${over.resets} ${raiseHint(plan)}`;
  try {
    await checkBudget(supabase, "deep", 1);
  } catch {
    return "rookie is saving its smarter model for today, so this one used the quick model.";
  }
  // Needs the 'deep' kind from schema-phase8.sql; until then deep answers can't be counted, so none are given.
  const { error } = await log(supabase, "deep", 1);
  return error ? "Deep answers aren't switched on yet, so this one used the quick model." : null;
}

export async function getUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AiError("Please log in.", 401);
  return user;
}

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const [{ data }, { data: docs }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle(),
    supabase.from("library_files").select("name,text").eq("kind", "other").order("created_at", { ascending: false }).limit(3),
  ]);
  if (!data) return null;
  const documents = (docs ?? []).filter((d) => d.text).map((d) => `${d.name}:\n${d.text.slice(0, 4000)}`);
  return { ...toProfileData(data), documents };
}

export function errorResponse(e: unknown) {
  const err = e instanceof AiError ? e : new AiError("Something went wrong. Try again.");
  if (!(e instanceof AiError)) console.error(e);
  const limit = err instanceof LimitError ? { title: err.title, upgrade: err.upgrade } : undefined;
  return Response.json({ error: err.message, limit }, { status: err.status });
}
