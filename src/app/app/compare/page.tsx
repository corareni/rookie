import type { Metadata } from "next";
import Link from "next/link";
import DeleteComparison from "@/components/DeleteComparison";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Compare · Rookie" };

type Row = { id: string; created_at: string; result: { bestPick: string; ranking: string[] }; application_ids: string[] };

export default async function ComparePage() {
  const supabase = await createClient();
  const [{ data: comps }, { data: apps }] = await Promise.all([
    supabase.from("comparisons").select("id,created_at,result,application_ids").order("created_at", { ascending: false }),
    supabase.from("applications").select("id,company,role,title"),
  ]);
  const name = (id: string) => {
    const a = apps?.find((x) => x.id === id);
    return a ? a.company ?? a.title : "Removed role";
  };

  return (
    <main className="pb-16">
      <section className="hero">
        <span className="livechip">Compare</span>
        <h1 className="display mt-5">
          Which one <em>first?</em>
        </h1>
        <p className="mt-4 max-w-[560px] text-[16px] text-[var(--ink2)]">
          On the <Link href="/app">Board</Link>, press <strong>+ Compare</strong> on 2 to 4 roles. Rookie lines them up side by
          side, picks the best one for you and tells you what would change its mind.
        </p>
      </section>

      <h2 className="sec mt-10">
        <small>[01]</small> Your comparisons
      </h2>
      <div className="mt-4 grid gap-3">
        {((comps ?? []) as Row[]).map((c) => (
          <div key={c.id} className="role !grid-cols-1 md:!grid-cols-[1fr_auto] md:items-center">
            <Link href={`/app/compare/${c.id}`} className="grid gap-1 no-underline">
              <span className="cap">
                {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-[20px] font-bold tracking-tight hover:underline">Best pick: {name(c.result.bestPick)}</span>
              <span className="text-[14px] text-[var(--ink2)]">{c.result.ranking.map(name).join(" · ")}</span>
            </Link>
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/app/compare/${c.id}`} className="act">
                Open
              </Link>
              <DeleteComparison id={c.id} />
            </span>
          </div>
        ))}
        {(comps ?? []).length === 0 && <p className="text-[var(--ink2)]">No comparisons yet.</p>}
      </div>
    </main>
  );
}
