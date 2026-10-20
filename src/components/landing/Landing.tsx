import Link from "next/link";
import { InterestedScreen, OfferScreen, Phone } from "@/components/landing/Screens";
import StepScroller from "@/components/landing/StepScroller";
import { site } from "@/lib/site";

const FEATURES = [
  { t: "Honest scores", d: "Out of 10, for you", tone: "bg-[var(--lilac)]" },
  { t: "Tailored CV", d: "In your own layout", tone: "bg-[var(--mint)]" },
  { t: "Cover letters", d: "From your real story", tone: "bg-[var(--peach)]" },
  { t: "Compare", d: "Best pick, side by side", tone: "bg-[var(--sky)]" },
  { t: "Track", d: "From applied to offer", tone: "bg-[var(--butter)]" },
];

const HOW = [
  { n: "01", t: "Build your profile", k: "once.", d: "Upload your CV or fill it in. Add your story, your skills and the barriers that matter to you.", tone: "tile-lilac", span: "span-7" },
  { n: "02", t: "Paste a job link", k: "for every role.", d: "Rookie reads the listing and gives an honest score with why you fit and the catch.", tone: "", span: "span-5" },
  { n: "03", t: "Apply", k: "with confidence.", d: "A tailored CV and cover letter for that company, from your own facts, ready as one-page PDFs.", tone: "", span: "span-5" },
  { n: "04", t: "Track", k: "until the offer.", d: "Assessments, interviews and next steps for every application on one board.", tone: "tile-mint", span: "span-7" },
];

const STATS = [
  {
    value: "109",
    label: "applications per internship posting",
    d: "on average in 2024-25, up from 62 a year earlier and 43 the year before.",
    src: "Handshake Internships Index 2025",
    href: "https://careers.augsburg.edu/resources/handshakes-internship-index-2025/",
    span: "span-7",
    tone: "tile-peach",
  },
  {
    value: "7.4s",
    label: "for a CV's first screen",
    d: "That's how long a recruiter looks before deciding. Your CV has to fit the role at a glance.",
    src: "Ladders eye-tracking study, 2018",
    href: "https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582",
    span: "span-5",
    tone: "",
  },
  {
    value: "33%",
    label: "tailor their CV for each role",
    d: "One in five job seekers sends the same CV everywhere.",
    src: "Novoresume job-seeker survey",
    href: "https://novoresume.com/career-blog/job-seeker-survey",
    span: "span-5",
    tone: "",
  },
  {
    value: "63%",
    label: "of interns were hired full-time",
    d: "The right internship is often the first job. It's worth getting the application right.",
    src: "NACE Internship & Co-op Report, 2026",
    href: "https://naceweb.org/talent-acquisition/internships/intern-conversion-rate-hits-highest-mark-in-five-years",
    span: "span-7",
    tone: "tile-sky",
  },
];

function CompetitionChart() {
  // Applications per internship posting (Handshake): 43 → 62 → 109, on a 0-120 scale.
  const y = (v: number) => 260 - (v / 120) * 220;
  const pts: [number, number][] = [
    [70, y(43)],
    [420, y(62)],
    [770, y(109)],
  ];
  const path = `M${pts[0][0]},${pts[0][1]} C240,${pts[0][1] - 4} 300,${pts[1][1] + 6} ${pts[1][0]},${pts[1][1]} S640,${pts[2][1] + 60} ${pts[2][0]},${pts[2][1]}`;
  return (
    <svg viewBox="0 0 840 300" className="mt-6 w-full" role="img" aria-labelledby="chart-title">
      <title id="chart-title">Average applications per internship posting: 43 in 2022-23, 62 in 2023-24, 109 in 2024-25</title>
      <line x1="40" y1="260" x2="820" y2="260" stroke="#fff" strokeOpacity="0.5" />
      {[60, 120].map((v) => (
        <line key={v} x1="40" x2="820" y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity="0.18" strokeDasharray="6 6" />
      ))}
      <path d={path} fill="none" stroke="var(--lilac)" strokeWidth="3" />
      {pts.map(([x, py], i) => (
        <g key={i}>
          <circle cx={x} cy={py} r="7" fill="var(--mint)" />
          <text x={x} y={py - 18} fill="#fff" fontSize="22" fontWeight="700" textAnchor="middle">
            {[43, 62, 109][i]}
          </text>
          <text x={x} y="288" fill="#fff" fillOpacity="0.7" fontSize="13" textAnchor="middle">
            {["2022-23", "2023-24", "2024-25"][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Landing({ signedIn }: { signedIn: boolean }) {
  const cta = signedIn ? { href: "/app", label: "Open your board" } : { href: "/signup", label: "Sign up free" };
  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <div className="puzzle">
        <section className="tile span-7 flex flex-col justify-between gap-10 lg:min-h-[480px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="chip-tag">Internships</span>
              <span className="chip-tag">First jobs</span>
            </div>
            <a href="#how" className="arrow-btn" aria-label="See how it works">
              ↗
            </a>
          </div>
          <div>
            <h1 className="text-[clamp(36px,5.2vw,64px)] leading-[1.04] tracking-[-0.035em]">
              Getting a job is harder than ever. <span className="font-light">Your applications don&apos;t have to be too.</span>
            </h1>
            <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-[var(--ink2)]">
              For students and graduates applying to internships and first jobs. Rookie scores every role you find out of
              10, writes a tailored CV and cover letter from your real experience, and tracks every application in one
              place.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href={cta.href} className="btn btn-lg">
                {cta.label}
              </Link>
              {!signedIn && (
                <span className="text-sm text-[var(--ink2)]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold">
                    Log in
                  </Link>
                </span>
              )}
            </div>
          </div>
        </section>
        <section className="tile tile-lilac span-5 grid place-items-center !py-10" aria-label="Example: a role scored for you">
          <Phone label="Example screen: a role scored 7 out of 10 with why you fit and the catch">
            <InterestedScreen />
          </Phone>
        </section>

        <section className="tile span-5 flex flex-col justify-between gap-6">
          <p className="text-[15px]">
            <b>Every posting gets crowded.</b>
          </p>
          <p className="flex items-end gap-3">
            <span className="text-[72px] font-bold leading-none tracking-[-0.04em]">109</span>
            <span className="pb-2 text-[14px] text-[var(--ink2)]">applications per internship posting on average</span>
          </p>
          <a href={STATS[0].href} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--mute)]">
            Source: {STATS[0].src} ↗
          </a>
        </section>
        <section className="tile span-7 flex flex-wrap items-center justify-between gap-6" aria-label="What Rookie does">
          <p className="max-w-[220px] text-[26px] leading-tight tracking-tight">
            <b>Everything</b> <span className="font-light">for your next application.</span>
          </p>
          <ul className="flex flex-wrap gap-3">
            {FEATURES.map((f) => (
              <li key={f.t} className={`bubble h-[104px] w-[104px] p-2 text-center ${f.tone}`}>
                <span>
                  <b className="block text-[13px] leading-tight">{f.t}</b>
                  <span className="mt-1 block text-[11px] leading-tight text-[var(--ink2)]">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Scroll story */}
      <section id="how" aria-labelledby="journey" className="mt-16 scroll-mt-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 id="journey" className="text-[clamp(30px,4vw,48px)] leading-none tracking-[-0.03em]">
            From first link <span className="font-light">to first day.</span>
          </h2>
          <p className="max-w-[360px] text-[15px] text-[var(--ink2)]">Six steps, one place. Scroll to see each part of Rookie.</p>
        </div>
        <StepScroller />
      </section>

      {/* How it works */}
      <section aria-labelledby="how-h" className="mt-16">
        <h2 id="how-h" className="text-[clamp(30px,4vw,48px)] leading-none tracking-[-0.03em]">
          How it works. <span className="font-light">Four steps.</span>
        </h2>
        <ol className="puzzle mt-6">
          {HOW.map((h) => (
            <li key={h.n} className={`tile ${h.tone} ${h.span} flex min-h-[230px] flex-col justify-between gap-6`}>
              <span className="text-[56px] font-light leading-none tracking-[-0.04em]">{h.n}</span>
              <div>
                <h3 className="text-[24px] leading-tight tracking-tight">
                  {h.t} <span className="font-light">{h.k}</span>
                </h3>
                <p className="mt-2 max-w-[460px] text-[15px] text-[var(--ink2)]">{h.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* The numbers */}
      <section id="numbers" aria-labelledby="numbers-h" className="mt-16 scroll-mt-6">
        <h2 id="numbers-h" className="text-[clamp(30px,4vw,48px)] leading-none tracking-[-0.03em]">
          The numbers. <span className="font-light">Why applying needs a better system.</span>
        </h2>
        <div className="puzzle mt-6">
          {STATS.map((s) => (
            <article key={s.value} className={`tile ${s.tone} ${s.span} flex min-h-[250px] flex-col justify-between gap-6`}>
              <p className="flex flex-wrap items-end gap-3">
                <span className="text-[clamp(56px,7vw,88px)] font-bold leading-none tracking-[-0.04em]">{s.value}</span>
                <span className="pb-2 text-[15px] font-bold">{s.label}</span>
              </p>
              <div>
                <p className="max-w-[440px] text-[15px] text-[var(--ink2)]">{s.d}</p>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[12px] text-[var(--mute)]">
                  Source: {s.src} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Competition chart */}
      <section aria-labelledby="competition" className="tile tile-black mt-[var(--gap)]">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <h2 id="competition" className="text-[clamp(26px,3.4vw,40px)] leading-[1.1] tracking-tight">
            Internships got almost twice as competitive in one year.{" "}
            <span className="font-light text-[var(--onblack2)]">Every application has to count.</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-white/80 lg:pt-2">
            The average internship posting now gets 109 applications; in tech it&apos;s 273, in finance 192. Sending the
            same CV everywhere doesn&apos;t cut it, and tailoring by hand takes hours. Rookie helps you pick the roles worth
            it and makes each application fit.
          </p>
        </div>
        <CompetitionChart />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--mint)] px-4 py-2 text-[15px] font-bold text-[var(--ink)]">~+150% in two years</span>
          <span className="rounded-full bg-[var(--lilac)] px-4 py-2 text-[15px] font-bold text-[var(--ink)]">273 per tech internship</span>
          <a href={STATS[0].href} target="_blank" rel="noopener noreferrer" className="ml-auto text-[12px] text-white/70">
            Source: {STATS[0].src} ↗
          </a>
        </div>
      </section>

      {/* Call to action */}
      <div className="puzzle mt-16">
        <section aria-labelledby="cta" className="tile tile-mint span-7 flex flex-col justify-between gap-8 lg:min-h-[420px]">
          <span className="chip-tag !bg-white">Free for students and graduates</span>
          <div>
            <h2 id="cta" className="text-[clamp(34px,4.6vw,60px)] leading-[1.04] tracking-[-0.035em]">
              Your next application <span className="font-light">starts here.</span>
            </h2>
            <p className="mt-4 max-w-[460px] text-[16px] text-[var(--ink2)]">
              Add your profile once, paste your first job link and see your score in under a minute. Private to you.
            </p>
            <Link href={cta.href} className="btn btn-lg mt-6">
              {cta.label}
            </Link>
          </div>
        </section>
        <section className="tile tile-peach span-5 grid place-items-center !py-10" aria-label="Example: an offer">
          <Phone label="Example screen: an application tracked all the way to an offer">
            <OfferScreen />
          </Phone>
        </section>
      </div>

      {/* Footer */}
      <footer className="tile tile-black mt-[var(--gap)] !pb-8">
        <p className="text-center text-[clamp(64px,17vw,220px)] font-bold leading-[0.9] tracking-[-0.05em]" aria-hidden="true">
          {site.name.toLowerCase()}
          <span className="text-[var(--lilac)]">.</span>
        </p>
        <div className="mt-10 grid gap-8 text-[15px] sm:grid-cols-3">
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
