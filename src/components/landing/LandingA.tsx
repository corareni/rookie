import Link from "next/link";
import { LANDING, landing, site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const steps =
  LANDING === "A"
    ? [
        { n: "01", t: "Paste the job link", d: "Or just type the role. It lands on your board in one click." },
        { n: "02", t: "Move it along", d: "Interested, Submitted, Assessment, Interview, Offer. Dates fill in by themselves." },
        { n: "03", t: "Never miss a deadline", d: "See what's due this week and what's overdue at a glance." },
      ]
    : [
        { n: "01", t: "Paste the job link", d: "Rookie reads the role, company, location and deadline for you." },
        { n: "02", t: "Get an honest score", d: "Out of 10, with why you fit and the catch. Compare roles side by side." },
        { n: "03", t: "Get your CV and letter", d: "Tailored from your real experience, ready to edit and download." },
      ];

const benefits =
  LANDING === "A"
    ? [
        { t: "Every application in one place", d: "No more spreadsheets, notes apps and lost tabs." },
        { t: "Deadlines you won't miss", d: "Overdue and due-this-week roles stand out in colour." },
        { t: "Private to you", d: "Only you can see your board. Nothing is shared." },
      ]
    : [
        { t: "Know where to spend your time", d: "Brutally honest scores, and roles that break your rules sorted out for you." },
        { t: "Hours of tailoring, done in a minute", d: "Only your real experience. Nothing made up." },
        { t: "Every application tracked", d: "Mark it as applied and follow it to the offer." },
      ];

const preview = [
  { col: "Interested", items: [{ t: "Analyst Intern @ Example Bank", chip: "due in 3 days", c: "chip-warn" }] },
  { col: "Submitted", items: [{ t: "Marketing Intern @ Example Studio", chip: "Sent 12 Oct", c: "chip-mute" }] },
  { col: "Interview", items: [{ t: "Strategy Intern @ Example Group", chip: "Interview 24 Oct", c: "chip-good" }] },
];

export default async function LandingA() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <section className="rounded-[var(--r)] bg-[var(--paper)] px-5 py-8 sm:px-10 sm:py-14">
        <p className="cap">For students applying to 10+ internships</p>
        <h1 className="display mt-4 max-w-[900px]">
          {landing.headlineStart} <em>{landing.headlineEm}</em> {landing.headlineEnd}
        </h1>
        <p className="mt-5 max-w-[560px] text-[17px] text-[var(--ink2)]">{landing.sub}</p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          {user ? (
            <Link href="/app" className="btn btn-lg">
              Open your board
            </Link>
          ) : (
            <Link href="/signup" className="btn btn-lg">
              Sign up free
            </Link>
          )}
          {!user && (
            <span className="text-sm text-[var(--ink2)]">
              Already have an account? <Link href="/login" className="font-semibold">Log in</Link>
            </span>
          )}
        </div>
      </section>

      <section aria-labelledby="how" className="mt-14">
        <h2 id="how" className="cap">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="card">
              <span className="text-sm font-semibold text-[var(--mute)]">{s.n}</span>
              <p className="mt-2 text-lg font-semibold">{s.t}</p>
              <p className="mt-1 text-[var(--ink2)]">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="preview" className="mt-14">
        <h2 id="preview" className="cap">
          What your board looks like <span className="normal-case tracking-normal">(example data)</span>
        </h2>
        <div className="mt-4 rounded-[var(--r)] bg-[var(--black)] p-4 sm:p-6">
          <div className="rounded-2xl bg-[var(--bg)] px-4 py-3 text-sm text-[var(--mute)]">
            https://careers.example.com/jobs/analyst-intern
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {preview.map((c) => (
              <div key={c.col}>
                <p className="mb-2 text-[13px] font-semibold text-[var(--onblack2)]">{c.col}</p>
                {c.items.map((i) => (
                  <div key={i.t} className="rounded-2xl bg-[var(--bg)] p-3">
                    <p className="text-sm font-semibold">{i.t}</p>
                    <span className={`chip ${i.c} mt-2`}>{i.chip}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="why" className="mt-14">
        <h2 id="why" className="cap">
          Why students use it
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {benefits.map((b) => (
            <li key={b.t} className="card">
              <p className="text-lg font-semibold">{b.t}</p>
              <p className="mt-1 text-[var(--ink2)]">{b.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-6 text-sm text-[var(--ink2)]">
        <span>Built by {site.author}</span>
        <span className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <a href={site.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </span>
      </footer>
    </main>
  );
}
