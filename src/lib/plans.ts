/** rookie's plans and their AI limits (Handover/pricing-proposal.md). Shared by the server checks and the Profile meter. */
export type Plan = "free" | "basic" | "premium";
export const PLANS: Plan[] = ["free", "basic", "premium"];
export const PLAN_LABEL: Record<Plan, string> = { free: "Free", basic: "Basic", premium: "Premium" };
export const PLAN_PRICE: Record<Plan, string> = { free: "€0", basic: "€9.99 a month", premium: "€19.99 a month" };
/** Cheaper ways to pay, from the pricing proposal. Shown on the landing page. */
export const PLAN_PASSES: Record<Plan, string> = { free: "No card needed", basic: "or €29.99 for a 4-month season", premium: "or €59.99 a season · €149.99 a year" };
export const isPlan = (p: unknown): p is Plan => PLANS.includes(p as Plan);

/** Every kind of AI run logged in ai_runs. `deep` is an assistant answer on the smarter model. */
export type Kind = "analyze" | "compare" | "generate" | "import" | "interview" | "library" | "rescore" | "email" | "chat" | "deep";

type Limit = { month: number; day: number };
const none: Limit = { month: 0, day: 0 };
// Not in the plan table: reading your own CV or a transcript. Same small daily cap on every plan.
const IMPORT: Limit = { month: Infinity, day: 5 };
const LIBRARY: Limit = { month: Infinity, day: 10 };

/** Monthly (calendar month, UTC) and daily limits. Where the proposal gives only a monthly number, it's the daily one too. */
export const LIMITS: Record<Plan, Record<Kind, Limit>> = {
  free: {
    analyze: { month: 5, day: 3 },
    rescore: { month: 3, day: 3 },
    generate: { month: 1, day: 1 },
    chat: { month: 10, day: 5 },
    deep: none,
    interview: none,
    compare: none,
    email: none,
    import: IMPORT,
    library: LIBRARY,
  },
  basic: {
    analyze: { month: 40, day: 10 },
    rescore: { month: 20, day: 20 },
    generate: { month: 12, day: 3 },
    chat: { month: 150, day: 25 },
    deep: { month: 10, day: 2 },
    interview: { month: 3, day: 1 },
    compare: { month: 3, day: 1 },
    email: none,
    import: IMPORT,
    library: LIBRARY,
  },
  premium: {
    analyze: { month: 100, day: 15 },
    rescore: { month: 50, day: 50 },
    generate: { month: 30, day: 5 },
    chat: { month: 300, day: 40 },
    deep: { month: 40, day: 5 },
    interview: { month: 8, day: 2 },
    compare: { month: 8, day: 2 },
    // One email check = one Gmail check (all inboxes) or one pasted email. 2 manual checks a day, 90 a month.
    email: { month: 90, day: 2 },
    import: IMPORT,
    library: LIBRARY,
  },
};

/** How each kind reads in messages and on the usage meter: [one, many]. */
export const KIND_LABEL: Record<Kind, [string, string]> = {
  analyze: ["role score", "role scores"],
  rescore: ["re-score", "re-scores"],
  generate: ["CV and cover letter", "CVs and cover letters"],
  chat: ["assistant message", "assistant messages"],
  deep: ["deep answer", "deep answers"],
  interview: ["interview prep", "interview preps"],
  compare: ["role comparison", "role comparisons"],
  email: ["email check", "email checks"],
  import: ["CV import", "CV imports"],
  library: ["document read", "document reads"],
};

/** The kinds shown on the Profile usage meter, in order. */
export const METER: Kind[] = ["analyze", "generate", "chat", "deep", "rescore", "interview", "compare", "email"];

/** Who can raise a limit: the next plans up, and top-ups once there's a paid plan. */
export function raiseHint(plan: Plan) {
  if (plan === "free") return "Basic and Premium raise this limit.";
  if (plan === "basic") return "Premium or a top-up (coming soon) raises it.";
  return "A top-up (coming soon) raises it.";
}

/** Window event the client fires when a server route says a limit is reached; the toasts listen for it. */
export const LIMIT_EVENT = "rk:limit";
export type LimitNotice = { title: string; message: string; upgrade?: boolean };
export const showLimit = (n: LimitNotice) => window.dispatchEvent(new CustomEvent<LimitNotice>(LIMIT_EVENT, { detail: n }));
