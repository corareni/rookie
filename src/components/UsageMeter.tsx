import { KIND_LABEL, LIMITS, METER, PLAN_LABEL, PLAN_PRICE, PLANS, type Kind, type Plan } from "@/lib/plans";

/** The user's plan and how much of this month's AI they've used. Read-only: plans can't be changed here yet. */
export default function UsageMeter({ plan, used, resets }: { plan: Plan; used: Record<Kind, { day: number; month: number }>; resets: string }) {
  return (
    <section id="plan" className="tile mt-[var(--gap)] scroll-mt-20" aria-labelledby="plan-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="plan-h" className="text-[18px]">
          Your plan: {PLAN_LABEL[plan]}
        </h2>
        <span className="text-[13px] text-[var(--mute)]">Monthly limits reset on {resets}. Daily ones at midnight UTC.</span>
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {METER.map((k) => {
          const limit = LIMITS[plan][k];
          const u = used[k];
          const label = KIND_LABEL[k][1].replace(/^./, (c) => c.toUpperCase());
          if (!limit.month)
            return (
              <li key={k} className="text-[14px] text-[var(--mute)]">
                <span className="font-semibold">{label}</span> · {LIMITS.basic[k].month ? "Basic and Premium" : "Premium"} only
              </li>
            );
          const share = Math.min(1, u.month / limit.month);
          return (
            <li key={k} className="text-[14px]">
              <span className="flex justify-between gap-3">
                <span className="font-semibold">{label}</span>
                <span className="tabular-nums text-[var(--ink2)]">
                  {u.month} of {limit.month} this month
                  {limit.day < limit.month && ` · ${u.day} of ${limit.day} today`}
                </span>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${share * 100}%`, background: share >= 1 ? "var(--bad)" : share >= 0.8 ? "var(--ink2)" : "var(--ink)" }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13px] text-[var(--ink2)]">
        {PLANS.filter((p) => p !== "free")
          .map((p) => `${PLAN_LABEL[p]} ${PLAN_PRICE[p]}`)
          .join(" · ")}
        . Upgrades and top-ups are coming soon; your board, calendar and library never lock.{" "}
        <a href="#waitlist" className="font-bold">
          Join the waiting list →
        </a>
      </p>
      {/* TODO(billing): Stripe Checkout goes here: an "Upgrade" button per plan (monthly, season pass, yearly) and top-up
          packs, posting to a server route that creates the Checkout session. A Stripe webhook (service role key, server
          only) then writes the plan to public.user_plans. Users can't write that table themselves. */}
    </section>
  );
}
