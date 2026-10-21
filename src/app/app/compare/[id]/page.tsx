import type { Metadata } from "next";
import Link from "next/link";
import DeleteComparison from "@/components/DeleteComparison";
import { titleCase } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Comparison · Rookie" };

type Role = {
  id: string;
  score: number;
  basics: Record<string, string>;
  lookFor: string[];
  roleIs: string[];
  fit: string[];
  pros: string[];
  cons: string[];
  verdict: string;
};
type Result = { bestPick: string; summary: string; ranking: string[]; roles: Role[]; questions: { q: string; why: string }[] };

const BASICS: [string, string][] = [
  ["location", "Location"],
  ["workMode", "Work mode"],
  ["start", "Start"],
  ["duration", "Duration"],
  ["pay", "Pay"],
  ["deadline", "Deadline"],
  ["languages", "Languages"],
];

function Section({
  n,
  title,
  k,
  tone,
  ordered,
  cols,
  company,
}: {
  n: string;
  title: string;
  k: keyof Role;
  tone?: string;
  ordered: Role[];
  cols: string;
  company: (id: string) => string | undefined;
}) {
  return (
    <section className="mt-8">
      <h2 className="sec">
        <small>[{n}]</small> {title}
      </h2>
      <div className={`mt-3 grid gap-3 ${cols}`}>
        {ordered.map((role) => (
          <div key={role.id} className={`card ${tone === "good" ? "!bg-[var(--mint)]" : tone === "bad" ? "!bg-[var(--peach)]" : ""}`}>
            <p className="mb-1 text-[13px] font-semibold text-[var(--mute)] lg:hidden">{company(role.id)}</p>
            {k === "verdict" ? (
              <p className="text-[14px] leading-relaxed">{role.verdict}</p>
            ) : (
              <ul className={`dot-list ${tone ?? ""} text-[14px] leading-snug`}>
                {(role[k] as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ComparisonPage({ params }: PageProps<"/app/compare/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: comp } = await supabase.from("comparisons").select("result,created_at,application_ids").eq("id", id).maybeSingle();
  if (!comp) {
    return (
      <main className="pt-6">
        <p className="text-lg font-semibold">This comparison doesn&apos;t exist or isn&apos;t yours.</p>
        <Link href="/app/compare">Back to Compare</Link>
      </main>
    );
  }
  const { data: apps } = await supabase.from("applications").select("id,company,role,title,job_url").in("id", comp.application_ids);
  const r = comp.result as Result;
  const info = (rid: string) => apps?.find((a) => a.id === rid);
  const ordered = r.ranking.map((rid) => r.roles.find((x) => x.id === rid)).filter((x): x is Role => !!x);
  const best = info(r.bestPick);
  const cols = ordered.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  const shared = { ordered, cols, company: (rid: string) => info(rid)?.company ?? undefined };


  return (
    <main className="pb-16">
      <div className="mb-[var(--gap)] flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/compare" className="act !justify-start no-underline">
          ← All comparisons
        </Link>
        <DeleteComparison id={id} goBack />
      </div>
      <section className="hero">
        <div className="flex items-center justify-between gap-3">
          <span className="livechip">Compare</span>
          <span className="rounded-full border border-[var(--line2)] px-3 py-1 text-[13px] text-[var(--ink2)]">
            {new Date(comp.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <h1 className="display mt-5">
          Best pick: <em>{best?.company ?? best?.title ?? "see below"}.</em>
        </h1>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-[var(--ink2)]">{r.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ordered.map((role, i) => (
            <span key={role.id} className="pill" aria-pressed={i === 0}>
              {String(i + 1).padStart(2, "0")} · {info(role.id)?.company ?? "Role"} · {role.score}/10
            </span>
          ))}
        </div>
      </section>

      <div className={`mt-6 grid gap-3 ${cols}`}>
        {ordered.map((role, i) => {
          const a = info(role.id);
          return (
            <div key={role.id} className={i === 0 ? "screen" : "card !bg-[var(--card2)] !border-transparent"}>
              <p className={`text-[12px] ${i === 0 ? "text-[var(--onblack2)]" : "text-[var(--mute)]"}`}>
                {String(i + 1).padStart(2, "0")}
                {i === 0 ? " · Best pick" : ""}
              </p>
              <p className="mt-1 text-[20px] font-bold">{a?.company ?? a?.title}</p>
              <p className={`text-[14px] ${i === 0 ? "text-[var(--onblack2)]" : "text-[var(--ink2)]"}`}>{titleCase(a?.role)}</p>
              <p className="mt-4">
                <span className="text-[40px] font-semibold leading-none">{role.score}</span>
                <span className={`text-sm ${i === 0 ? "text-[var(--onblack2)]" : "text-[var(--mute)]"}`}> /10 fit</span>              </p>
              <p className="mt-3 flex gap-4 text-[14px] font-semibold">
                <Link href={`/app/a/${role.id}`}>On board →</Link>
                {a?.job_url && (
                  <a href={a.job_url} target="_blank" rel="noopener noreferrer">
                    Listing ↗
                  </a>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="sec">
          <small>[01]</small> The basics
        </h2>
        <div className={`mt-3 grid gap-3 ${cols}`}>
          {ordered.map((role) => (
            <dl key={role.id} className="card grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-[14px]">
              <p className="col-span-2 text-[13px] font-semibold text-[var(--mute)] lg:hidden">{info(role.id)?.company}</p>
              {BASICS.map(([k, label]) => (
                <div key={k} className="contents">
                  <dt className="text-[var(--mute)]">{label}</dt>
                  <dd>{role.basics?.[k] ?? "Not stated"}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      </section>

      <Section {...shared} n="02" title="What they look for" k="lookFor" />
      <Section {...shared} n="03" title="What the role is" k="roleIs" />
      <Section {...shared} n="04" title="How you fit" k="fit" />
      <Section {...shared} n="05" title="Pros" k="pros" tone="good" />
      <Section {...shared} n="06" title="Cons" k="cons" tone="bad" />
      <Section {...shared} n="07" title="Verdict" k="verdict" />

      {r.questions.length > 0 && (
        <section className="mt-8">
          <h2 className="sec">
            <small>[08]</small> Questions that would change the ranking
          </h2>
          <div className="mt-3 grid gap-3">
            {r.questions.map((q) => (
              <div key={q.q} className="card">
                <p className="font-semibold">{q.q}</p>
                <p className="mt-1 text-[14px] text-[var(--ink2)]">{q.why}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
