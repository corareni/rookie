import Link from "next/link";
import { InterestedScreen, Phone } from "@/components/landing/Screens";
import StepScroller from "@/components/landing/StepScroller";
import { site } from "@/lib/site";

const HOW = [
  { n: "1", t: "Paste", d: "Drop in a job link, or paste the description if the site blocks reading. Rookie fills in the details." },
  { n: "2", t: "Score", d: "An honest score out of 10 for you, with why you fit and the catch. No sugar-coating." },
  { n: "3", t: "Write", d: "A CV and cover letter tailored to the company, from your real experience only. Nothing made up." },
  { n: "4", t: "Track", d: "From interested to offer: statuses, deadlines and next steps for every application." },
];

const STATS = [
  {
    label: "Competition",
    value: "109",
    d: "applications per internship posting on average in 2024-25, up from 62 a year earlier.",
    src: "Handshake Internships Index 2025",
    href: "https://careers.augsburg.edu/resources/handshakes-internship-index-2025/",
    icon: "people",
  },
  {
    label: "First impression",
    value: "7.4s",
    d: "is how long a recruiter spends on a CV's first screen. It has to fit the role at a glance.",
    src: "Ladders eye-tracking study, 2018",
    href: "https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582",
    icon: "eye",
  },
  {
    label: "Tailoring",
    value: "33%",
    d: "of job seekers make a different CV for different roles. 19% send the same CV everywhere.",
    src: "Novoresume job-seeker survey",
    href: "https://novoresume.com/career-blog/job-seeker-survey",
    icon: "doc",
  },
  {
    label: "What's at stake",
    value: "63%",
    d: "of 2024-25 interns were converted into full-time hires. The right internship is often the first job.",
    src: "NACE Internship & Co-op Report, 2026",
    href: "https://naceweb.org/talent-acquisition/internships/intern-conversion-rate-hits-highest-mark-in-five-years",
    icon: "badge",
  },
];

function Icon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
      {name === "people" && (
        <g {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M16.5 14c2.4.2 4 1.6 4.5 4.5" />
        </g>
      )}
      {name === "eye" && (
        <g {...p}>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </g>
      )}
      {name === "doc" && (
        <g {...p}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4M9 12h6M9 16h6" />
        </g>
      )}
      {name === "badge" && (
        <g {...p}>
          <circle cx="12" cy="9" r="5.5" />
          <path d="m9.5 9 1.8 1.8L14.8 7.3M8.5 14l-1.5 7 5-2.5 5 2.5-1.5-7" />
        </g>
      )}
    </svg>
  );
}

function CompetitionChart() {
  // Applications per internship posting (Handshake): 43 → 62 → 109. Plotted on a 0-120 scale.
  const pts = [
    [60, 300 - (43 / 120) * 240],
    [420, 300 - (62 / 120) * 240],
    [780, 300 - (109 / 120) * 240],
  ];
  const path = `M${pts[0][0]},${pts[0][1]} C240,${pts[0][1] - 4} 300,${pts[1][1] + 6} ${pts[1][0]},${pts[1][1]} S660,${pts[2][1] + 60} ${pts[2][0]},${pts[2][1]}`;
  return (
    <svg viewBox="0 0 860 330" className="mt-8 w-full" role="img" aria-labelledby="chart-title">
      <title id="chart-title">Average applications per internship posting: 43 in 2022-23, 62 in 2023-24, 109 in 2024-25</title>
      <line x1="40" y1="300" x2="830" y2="300" stroke="#fff" strokeWidth="1.5" />
      <line x1="40" y1="40" x2="40" y2="300" stroke="#fff" strokeWidth="1.5" />
      {[60, 120].map((v) => (
        <line key={v} x1="40" x2="830" y1={300 - (v / 120) * 240} y2={300 - (v / 120) * 240} stroke="#fff" strokeOpacity="0.25" strokeDasharray="6 6" />
      ))}
      <text x="20" y="170" fill="#fff" fontSize="13" textAnchor="middle" transform="rotate(-90 20 170)">Applications per posting</text>
      <path d={path} fill="none" stroke="var(--lime)" strokeWidth="3" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="var(--lime)" />
          <text x={x} y={y - 18} fill="#fff" fontSize="20" fontWeight="700" textAnchor="middle">
            {[43, 62, 109][i]}
          </text>
          <text x={x} y="322" fill="#fff" fillOpacity="0.7" fontSize="13" textAnchor="middle">
            {["2022-23", "2023-24", "2024-25"][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function LandingB({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <section className="relative rounded-[28px] bg-[var(--paper)] px-5 pt-8 pb-10 sm:px-10 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="min-w-0">
            <p className="max-w-[260px] text-[13px] leading-snug text-[var(--ink2)]">
              For students applying to 10+ internships.
              <br />
              <br />
              Honest scores. Tailored applications. One board.
            </p>
            <h1 className="mega mt-6 text-[clamp(40px,10.2vw,112px)] lg:text-[clamp(64px,7.4vw,112px)]">
              Land the
              <br />
              right
              <br />
              internship.
            </h1>
            <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-[var(--ink2)]">
              Paste a job link. Rookie scores your chances out of 10, writes a tailored CV and cover letter from your real
              experience, and tracks every application from interested to offer.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href={signedIn ? "/app" : "/signup"} className="btn btn-lg btn-lime">
                {signedIn ? "Open your board" : "Sign up free"}
              </Link>
              {!signedIn && (
                <span className="text-sm text-[var(--ink2)]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold">
                    Log in
                  </Link>
                </span>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            <Phone label="Example screen: a role scored 7 out of 10">
              <InterestedScreen />
            </Phone>
          </div>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-[120px_1fr_1fr] sm:items-end">
          <svg viewBox="0 0 100 60" className="hidden w-[90px] sm:block" aria-hidden="true">
            <path d="M0 0h28l22 34L72 0h28L58 60H42z" fill="var(--ink)" />
          </svg>
          <p className="max-w-[260px] text-[13px] leading-snug">Paste links from company careers pages, Greenhouse, Lever, Workday and more.</p>
          <p className="max-w-[260px] text-[13px] leading-snug">Free for students. Your board and your CV stay private to you.</p>
        </div>
      </section>

      {/* Steps with the sticky phone */}
      <section aria-labelledby="journey" className="mt-4 rounded-[28px] bg-white px-5 py-10 shadow-[0_0_0_1px_var(--line)] sm:px-12 lg:py-4">
        <h2 id="journey" className="sr-only">
          From finding a role to your internship
        </h2>
        <StepScroller />
      </section>

      {/* 1 2 3 4 */}
      <section aria-labelledby="how" className="py-20">
        <h2 id="how" className="sr-only">
          How it works
        </h2>
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((h) => (
            <li key={h.n}>
              <span className="mega block text-[clamp(110px,14vw,170px)] leading-[0.8]" aria-hidden="true">
                {h.n}
              </span>
              <h3 className="mt-6 text-[24px] font-semibold uppercase tracking-tight">{h.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink2)]">{h.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The numbers */}
      <section aria-labelledby="numbers">
        <h2 id="numbers" className="text-[28px] font-semibold uppercase tracking-tight">
          The numbers
        </h2>
        <p className="mt-1 text-[15px] text-[var(--ink2)]">Why applying to internships needs a better system.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {STATS.map((s) => (
            <article key={s.label} className="flex min-h-[250px] flex-col rounded-[24px] bg-white p-6 shadow-[0_0_0_1px_var(--line)]">
              <p className="text-[15px]">{s.label}</p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                <Icon name={s.icon} />
                <span className="text-[clamp(56px,8vw,88px)] font-medium leading-none tracking-[-0.04em]">{s.value}</span>
              </div>
              <p className="mt-5 max-w-[360px] text-[15px] leading-snug text-[var(--ink2)]">{s.d}</p>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="mt-3 text-[12px] text-[var(--mute)]">
                Source: {s.src} ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Dark chart */}
      <section aria-labelledby="competition" className="mt-6 rounded-[28px] bg-[var(--dark)] px-5 py-8 text-white sm:px-10 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <h2 id="competition" className="text-[clamp(24px,3.2vw,36px)] font-semibold uppercase leading-[1.1] tracking-tight text-[var(--lime)]">
            Internships got almost twice as competitive in one year. Every application has to count.
          </h2>
          <p className="text-[15px] leading-relaxed text-white/85 lg:pt-14">
            The average internship posting now gets 109 applications. In tech it&apos;s 273, in finance 192. Sending the same
            CV everywhere doesn&apos;t cut it, and tailoring by hand takes hours. Rookie helps you pick the roles worth it and
            makes each application fit.
          </p>
        </div>
        <CompetitionChart />
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-2xl bg-[var(--lime)] px-4 py-2 text-[18px] font-semibold text-[var(--ink)]">~+150% in two years</span>
          <span className="rounded-2xl bg-[var(--lime)] px-4 py-2 text-[18px] font-semibold text-[var(--ink)]">273 per tech internship</span>
        </div>
        <a
          href="https://careers.augsburg.edu/resources/handshakes-internship-index-2025/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-[12px] text-white/70"
        >
          Source: Handshake Internships Index 2025 ↗
        </a>
      </section>

      {/* Call to action */}
      <section aria-labelledby="cta" className="py-20">
        <h2 id="cta" className="mega mx-auto max-w-[900px] text-center text-[clamp(44px,9vw,120px)]">
          From rookie <span className="text-[0.5em] align-middle">to</span> hired
        </h2>
        <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
          <div className="rounded-[28px] bg-white px-6 py-10 shadow-[0_0_0_1px_var(--line)]">
            <Phone label="Example screen: an offer at the end of the process">
              <OfferMini />
            </Phone>
          </div>
          <div>
            <h3 className="text-[22px] font-semibold">Build your shortlist tonight</h3>
            <p className="mt-3 max-w-[440px] text-[16px] leading-relaxed text-[var(--ink2)]">
              Add your CV once, paste your first job link and see your score in under a minute. Free for students, private
              to you.
            </p>
            <Link href="/signup" className="btn btn-lg mt-6">
              Sign up free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mb-6 rounded-[28px] bg-[var(--dark)] px-5 pt-6 pb-10 text-white sm:px-8">
        <p className="mega text-center text-[clamp(56px,18.5vw,250px)] leading-[0.85] text-[var(--lime)]" aria-hidden="true">
          {site.name}
        </p>
        <div className="mt-14 grid gap-8 text-[15px] sm:grid-cols-3">
          <div>
            <p className="text-[13px] text-white/60">Product</p>
            <p className="mt-3 grid gap-2">
              <Link href="/signup">Sign up</Link>
              <Link href="/login">Log in</Link>
            </p>
          </div>
          <div>
            <p className="text-[13px] text-white/60">About</p>
            <p className="mt-3 grid gap-2">
              <span>Built by {site.author}</span>
              <a href={site.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </p>
          </div>
          <div>
            <p className="text-[13px] text-white/60">Legal</p>
            <p className="mt-3 grid gap-2">
              <Link href="/privacy">Privacy</Link>
              <span className="text-white/60">AI by Google Gemini. Data stored in the EU.</span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function OfferMini() {
  return (
    <div className="flex h-full flex-col justify-center text-center">
      <span className="mx-auto inline-block rounded-full bg-[var(--lime)] px-4 py-1.5 text-[13px] font-bold text-[var(--ink)]">Offer</span>
      <p className="mt-4 text-[22px] font-bold leading-tight">Example Bank</p>
      <p className="muted text-[12px]">Analyst Intern</p>
      <p className="muted mx-auto mt-6 max-w-[200px] text-[11px]">Interested → Submitted → Assessment → Interview → Offer</p>
    </div>
  );
}
