import Link from "next/link";
import { Wordmark } from "@/components/Header";
import { Badge, InterestedScreen, OfferScreen, Phone } from "@/components/landing/Screens";
import Reveal from "@/components/Reveal";
import StepScroller from "@/components/landing/StepScroller";
import { site } from "@/lib/site";

const FEATURES = [
  { t: "Honest scores", d: ["Out of 10,", "for you"], tone: "bg-[var(--lilac)]" },
  { t: "Tailored CV", d: ["In a clean,", "one-page format"], tone: "bg-[var(--mint)]" },
  { t: "Cover letters", d: ["From your", "real story"], tone: "bg-[var(--peach)]" },
  { t: "Compare", d: ["Best pick,", "side by side"], tone: "bg-[var(--sky)]" },
  { t: "Track", d: ["From applied", "to offer"], tone: "bg-[var(--butter)]" },
];

const HOW = [
  { n: "01", t: "Build your profile", k: "once.", d: "Upload your CV or fill it in. Add your story, your skills and the barriers that matter to you.", tone: "tile-lilac", span: "span-7" },
  { n: "02", t: "Paste a job link", k: "for every role.", d: "Rookie reads the listing and gives an honest score with why you fit and the catch.", tone: "tile-mint", span: "span-5" },
  { n: "03", t: "Apply", k: "with confidence.", d: "A tailored CV and cover letter for that company, from your own facts, as one-page PDF or Word files.", tone: "tile-peach", span: "span-5" },
  { n: "04", t: "Track", k: "until the offer.", d: "Assessments, interviews, practice questions and next steps for every application on one board.", tone: "tile-sky", span: "span-7" },
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
        <section className="tile tile-lilac span-5 relative grid place-items-center overflow-hidden !py-12" aria-label="Example: a role scored for you">
          <Wordmark className="absolute top-6 left-7 text-[28px] leading-none" dot="text-white" />
          <span className="absolute top-7 right-7 rounded-full bg-white/70 px-3 py-1 text-[11px] uppercase tracking-wide">Example</span>
          <div className="float-a absolute top-[26%] left-[5%] hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] xl:flex">
            <Badge co="google" size={26} />
            <span className="text-[12px] leading-tight">
              <b className="block">Google</b>
              <span className="text-[var(--ink2)]">8/10 for you</span>
            </span>
          </div>
          <div className="float-b absolute right-[5%] bottom-[18%] hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] xl:flex">
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[var(--mint)] text-[13px] font-bold">✓</span>
            <span className="text-[12px] leading-tight">
              <b className="block">CV + letter ready</b>
              <span className="text-[var(--ink2)]">PDF or Word</span>
            </span>
          </div>
          <Phone label="Example screen: Google's Associate Product Manager Intern role scored 8 out of 10, with why you fit and the catch">
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
        <section className="tile span-7 flex flex-col justify-between gap-6" aria-label="What Rookie does">
          <p className="text-[26px] leading-tight tracking-tight">
            <b>Everything</b> <span className="font-light">for your next application.</span>
          </p>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.t} delay={i * 70} className={`rounded-[16px] px-3.5 py-4 ${f.tone}`}>
                <b className="block text-[14px] leading-tight">{f.t}</b>
                <span className="mt-2 block text-[12.5px] leading-snug text-[var(--ink2)]">
                  {f.d[0]}
                  <br />
                  {f.d[1]}
                </span>
              </Reveal>
            ))}
          </ul>
        </section>
      </div>

      {/* Scroll story */}
      <section id="how" aria-labelledby="journey" className="mt-16 scroll-mt-6">
        <Reveal className="mb-4">
          <h2 id="journey" className="text-[clamp(30px,4vw,52px)] leading-none tracking-[-0.03em]">
            From first link <span className="font-light">to first day.</span>
          </h2>
          <p className="mt-3 text-[16px] text-[var(--ink2)]">Six steps, one place. Scroll to see each part of Rookie.</p>
        </Reveal>
        <StepScroller />
      </section>

      {/* How it works */}
      <section aria-labelledby="how-h" className="mt-16">
        <h2 id="how-h" className="text-[clamp(30px,4vw,48px)] leading-none tracking-[-0.03em]">
          How it works. <span className="font-light">Four steps.</span>
        </h2>
        <ol className="puzzle mt-6">
          {HOW.map((h) => (
            <Reveal as="li" key={h.n} delay={(Number(h.n) % 2) * 90} className={`tile ${h.tone} ${h.span} flex min-h-[230px] flex-col justify-between gap-6`}>
              <span className="text-[56px] font-light leading-none tracking-[-0.04em]">{h.n}</span>
              <div>
                <h3 className="text-[24px] leading-tight tracking-tight">
                  {h.t} <span className="font-light">{h.k}</span>
                </h3>
                <p className="mt-2 max-w-[460px] text-[15px] text-[var(--ink2)]">{h.d}</p>
              </div>
            </Reveal>
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
            <Reveal as="article" key={s.value} className={`tile ${s.tone} ${s.span} flex min-h-[250px] flex-col justify-between gap-6`}>
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
            </Reveal>
          ))}
        </div>
      </section>

      {/* Competition chart */}
      <Reveal as="section" className="tile tile-black mt-[var(--gap)]">
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
      </Reveal>

      {/* Call to action: the offer, in one big red rectangle */}
      <Reveal as="section" className="tile tile-red relative mt-16 overflow-hidden">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] uppercase tracking-[0.14em]">
              <span className="h-2 w-2 rounded-full bg-white" /> Offer received
            </span>
            <h2 id="cta" className="mt-6 text-[clamp(40px,6.4vw,92px)] leading-[0.98] tracking-[-0.045em]">
              You landed <span className="font-light">the right one.</span>
            </h2>
            <p className="mt-5 flex items-center gap-3 text-[18px]">
              <Badge co="google" size={34} />
              <span>
                <b>Google</b> <span className="font-light">· Associate Product Manager Intern</span>
              </span>
            </p>
            <p className="mt-6 max-w-[480px] text-[16px] text-white/85">
              Add your profile once, paste your first job link and see your score in under a minute. Free for students and
              graduates, private to you.
            </p>
            <Link href={cta.href} className="btn btn-lg mt-7 !border-white !bg-white !text-[var(--red)]">
              {cta.label}
            </Link>
          </div>
          <div className="grid place-items-center">
            <Phone label="Example screen: an application tracked all the way to an offer from Google">
              <OfferScreen />
            </Phone>
          </div>
        </div>
      </Reveal>

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
