// Phone screens for the landing page: small versions of the real app pages (same tiles, pills, colours and
// labels). Companies are real, the data is an illustration (labelled "Example"); letter badges, never logos.

const COMPANIES = {
  google: { name: "Google", letter: "G", tone: "bg-[var(--sky)]" },
  santander: { name: "Santander", letter: "S", tone: "bg-[var(--peach)]" },
  spotify: { name: "Spotify", letter: "S", tone: "bg-[var(--mint)]" },
  apple: { name: "Apple", letter: "A", tone: "bg-[var(--lilac)]" },
  rookie: { name: "rookie", letter: "r.", tone: "bg-[var(--lilac)]" },
} as const;
type Co = keyof typeof COMPANIES;

export function Badge({ co, size = 30 }: { co: Co; size?: number }) {
  const c = COMPANIES[co];
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center rounded-full font-bold text-[var(--ink)] ${c.tone}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {c.letter}
    </span>
  );
}

/** The app's top: the "r." mark, then the page title in the app's bold-then-light style. */
function Top({ title, light, sub }: { title: string; light?: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between" aria-hidden="true">
        <span className="text-[17px] font-bold leading-none tracking-[-0.04em]">
          r<span className="text-[#b6abf7]">.</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-[var(--tile)] px-2 py-0.5 text-[9px] uppercase tracking-wide text-[var(--mute)]">Example</span>
          <span className="grid size-5 place-items-center rounded-full bg-[var(--black)]">
            <span className="block h-[7px] w-[7px] rounded-t-full border border-b-0 border-white" />
          </span>
        </span>
      </div>
      <p className="mt-3 text-[16px] leading-tight tracking-tight">
        <b>{title}</b> {light && <span className="font-light">{light}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[10.5px] text-[var(--mute)]">{sub}</p>}
    </div>
  );
}

const Chip = ({ children, tone = "bg-white" }: { children: React.ReactNode; tone?: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold text-[var(--ink)] ${tone}`}>{children}</span>
);

const Tile = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-[14px] bg-[var(--tile)] p-2.5 ${className}`}>{children}</div>
);

const Btn = ({ children, tone = "bg-[var(--ink)] text-white" }: { children: React.ReactNode; tone?: string }) => (
  <div className={`rounded-full px-3 py-1.5 text-center text-[10px] font-bold ${tone}`}>{children}</div>
);

/** Like the app's small action buttons on a role card. */
const Act = ({ children, tone = "bg-white" }: { children: React.ReactNode; tone?: string }) => (
  <div className={`rounded-[9px] px-2 py-1.5 text-center text-[9.5px] font-bold ${tone}`}>{children}</div>
);

/** A role card as on the board: badge, company bold, role light, score, and the action buttons. */
function RoleCard({ co, role, score, chips }: { co: Co; role: string; score?: number; chips?: React.ReactNode }) {
  return (
    <Tile>
      <div className="flex items-start gap-2">
        <Badge co={co} size={26} />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] leading-tight">
            <b>{COMPANIES[co].name}</b> <span className="font-light">{role}</span>
          </p>
          {chips && <div className="mt-1 flex flex-wrap gap-1">{chips}</div>}
        </div>
        {score && <span className="rounded-full bg-[var(--goodbg)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--good)]">{score}/10</span>}
      </div>
      <div className="mt-2 grid gap-1">
        <Btn>Mark as applied</Btn>
        <div className="grid grid-cols-[1.45fr_1fr] gap-1">
          <Act tone="bg-[var(--lilac)]">CV and Cover Letter</Act>
          <Act tone="bg-[var(--peach)]">+ Compare</Act>
        </div>
      </div>
    </Tile>
  );
}

export function FindScreen() {
  return (
    <>
      <Top title="Your board." light="One clear board." />
      <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
        <Tile className="!bg-[var(--lilac)] !p-2">
          <b className="block text-[16px] leading-none">4</b>Open roles
        </Tile>
        <Tile className="!p-2">
          <b className="block text-[16px] leading-none">2</b>Close in 14 days
        </Tile>
      </div>
      <div className="mt-2 rounded-[14px] bg-[var(--mint)] p-2">
        <p className="text-[9px] text-[var(--ink2)]">[01] Add a role</p>
        <div className="mt-1 flex gap-1">
          <p className="min-w-0 flex-1 truncate rounded-full border border-[var(--ink)] bg-white px-2.5 py-1.5 text-[9.5px] text-[var(--ink2)]">
            careers.google.com/jobs/apm-intern
          </p>
          <span className="rounded-full bg-[var(--ink)] px-2.5 py-1.5 text-[9.5px] font-bold text-white">Add</span>
        </div>
      </div>
      <p className="mt-2.5 text-[10.5px] font-bold">
        <span className="font-normal text-[var(--mute)]">[02]</span> Open roles
      </p>
      <div className="mt-1.5">
        <RoleCard
          co="google"
          role="Associate Product Manager Intern"
          score={8}
          chips={
            <>
              <Chip>Zurich</Chip>
              <Chip>Summer 2027</Chip>
              <Chip tone="bg-[var(--butter)]">Closes 14 Nov</Chip>
            </>
          }
        />
      </div>
      <p className="mt-auto text-[10px] text-[var(--mute)]">Company, role, location, timing and deadline, filled in for you.</p>
    </>
  );
}

export function InterestedScreen() {
  return (
    <>
      <Top title="Google" light="Associate Product Manager Intern" sub="Zurich · Summer 2027" />
      <Tile className="flex items-end justify-between !bg-[var(--mint)]">
        <span>
          <span className="text-[38px] font-bold leading-none tracking-[-0.04em]">8</span>
          <span className="text-[12px] text-[var(--ink2)]">/10</span>
        </span>
        <span className="pb-1 text-right text-[10px] text-[var(--ink2)]">
          your chance,
          <br />
          honestly
        </span>
      </Tile>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] leading-tight">
        {[
          ["Start", "Jun 2027"],
          ["Length", "12 weeks"],
          ["Setup", "Hybrid"],
        ].map(([k, v]) => (
          <span key={k} className="rounded-[10px] bg-[var(--tile)] px-2 py-1.5">
            <span className="block text-[var(--mute)]">{k}</span>
            <b>{v}</b>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Chip tone="bg-[var(--sky)]">Tech & product</Chip>
        <Chip tone="bg-[var(--butter)]">Closes in 9 days</Chip>
      </div>
      <Tile className="mt-2 grid gap-1.5 text-[9.5px] leading-snug">
        <p>
          <b>Why you:</b>{" "}
          <span className="text-[var(--ink2)]">
            product sense from building your app project, data work at your internship, and German and English for a team
            spread across Europe.
          </span>
        </p>
        <p>
          <b>The catch:</b> <span className="text-[var(--ink2)]">they ask for SQL you only show at a basic level. Lead with your dashboards.</span>
        </p>
      </Tile>
      <div className="mt-2 rounded-[14px] bg-[var(--butter)] p-2.5 text-[9.5px] leading-snug">
        <b>Notes for your CV and letter</b>
        <p className="mt-0.5 text-[var(--ink2)]">Met their recruiter at the IE career fair. Mention the n8n automation project.</p>
      </div>
      <div className="mt-auto grid grid-cols-[auto_1fr] gap-1.5 whitespace-nowrap">
        <Act tone="bg-[var(--peach)]">+ Compare</Act>
        <Act tone="bg-[var(--lilac)]">CV and Cover Letter</Act>
      </div>
    </>
  );
}

export function ApplyScreen() {
  return (
    <>
      <Top title="Your tailored" light="CV and Cover Letter" sub="For Google · Associate Product Manager Intern" />
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-full bg-[var(--tile)] p-1 text-center text-[8.5px]">
        <span className="rounded-full bg-[var(--lilac)] py-1 font-bold">CV and Letter</span>
        <span className="py-1 text-[var(--ink2)]">CV only</span>
        <span className="py-1 text-[var(--ink2)]">Letter only</span>
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-white p-3 font-serif text-[8.5px] leading-[1.45] text-black shadow-sm">
        <p className="text-center text-[10px] font-bold tracking-wide">ALEX MORENO</p>
        <p className="mt-0.5 border-b border-black pb-1 text-center text-[7px]">Madrid, Spain | linkedin.com/in/alex-moreno</p>
        <p className="mt-2 font-bold">Re: Associate Product Manager Intern</p>
        <p className="mt-1">Dear Hiring Team,</p>
        <p className="mt-1">
          The first product I shipped was a ride-sharing app for my campus. Watching students actually use it taught me
          more than any lecture, and it is why I want to build products at Google…
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Chip tone="bg-[var(--tile)]">Style: Story</Chip>
        <Chip tone="bg-[var(--tile)]">Length: Standard</Chip>
        <Chip tone="bg-[var(--mint)]">1 page</Chip>
      </div>
      <p className="mt-2 text-[10px] text-[var(--mute)]">Only facts from your profile. Edit anything before you send it.</p>
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <Act tone="bg-[var(--mint)]">↓ PDF</Act>
        <Act tone="bg-[var(--lilac)]">↓ Word</Act>
      </div>
    </>
  );
}

export function AssessmentScreen() {
  const waiting: [Co, string, string][] = [
    ["google", "APM Intern", "Sent 2 Nov"],
    ["spotify", "Marketing Intern", "Sent 30 Oct"],
  ];
  return (
    <>
      <Top title="Applied" light="3." sub="Where everything stands" />
      <div className="grid grid-cols-3 gap-1 text-center text-[9px]">
        {[
          ["2", "Submitted", "bg-[var(--lilac)]"],
          ["1", "Test", "bg-[var(--tile)]"],
          ["0", "Offers", "bg-[var(--tile)]"],
        ].map(([n, k, tone]) => (
          <span key={k} className={`rounded-[10px] py-1.5 ${tone}`}>
            <b className="block text-[14px] leading-none">{n}</b>
            {k}
          </span>
        ))}
      </div>
      <p className="mt-2 rounded-[10px] bg-[var(--warnbg)] px-2 py-1 text-[9.5px] font-bold text-[var(--warn)]">● Interviews and assessments</p>
      <Tile className="mt-1.5">
        <div className="flex items-center gap-2">
          <Badge co="santander" size={24} />
          <p className="min-w-0 flex-1 text-[11px] leading-tight">
            <b>Santander</b> <span className="font-light">Graduate Analyst</span>
          </p>
          <Chip tone="bg-[var(--butter)]">Assessment</Chip>
        </div>
        <p className="mt-1.5 text-[9.5px] font-bold">Online test · Fri 7 Nov, 10:00</p>
        <div className="mt-1 flex gap-1 whitespace-nowrap">
          <span className="rounded-full bg-white px-2 py-1 text-[8.5px] font-bold">Practise questions</span>
          <span className="rounded-full bg-[var(--sky)] px-2 py-1 text-[8.5px] font-bold">＋ Calendar</span>
        </div>
      </Tile>
      <p className="mt-2 rounded-[10px] bg-[var(--card2)] px-2 py-1 text-[9.5px] font-bold">● Submitted, waiting to hear back</p>
      <div className="mt-1.5 grid gap-1.5">
        {waiting.map(([co, role, next]) => (
          <div key={co} className="flex items-center gap-2 rounded-[12px] bg-[var(--tile)] px-2 py-1.5">
            <Badge co={co} size={22} />
            <p className="min-w-0 flex-1 truncate text-[10.5px]">
              <b>{COMPANIES[co].name}</b> <span className="font-light">{role}</span>
            </p>
            <span className="text-[9px] text-[var(--mute)]">{next}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function InterviewScreen() {
  const rows: [Co, number][] = [
    ["google", 8],
    ["santander", 7],
    ["spotify", 6],
  ];
  return (
    <>
      <Top title="Best pick:" light="Google." sub="Comparing 3 roles" />
      <div className="grid gap-1.5">
        {rows.map(([co, s], i) => (
          <div key={co} className={`flex items-center gap-2 rounded-[12px] px-2.5 py-1.5 ${i === 0 ? "bg-[var(--lilac)]" : "bg-[var(--tile)]"}`}>
            <span className="text-[9.5px] text-[var(--mute)]">0{i + 1}</span>
            <Badge co={co} size={22} />
            <span className="flex-1 text-[11px] font-bold">{COMPANIES[co].name}</span>
            <span className="text-[11px] font-bold">{s}/10</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9.5px] leading-snug">
        <Tile className="!bg-[var(--mint)]">
          <b>Pros</b>
          <p className="text-[var(--ink2)]">Product role, strong mentoring, fits your app project</p>
        </Tile>
        <Tile className="!bg-[var(--peach)]">
          <b>Cons</b>
          <p className="text-[var(--ink2)]">Relocation to Zurich, SQL test</p>
        </Tile>
      </div>
      <Tile className="mt-2 text-[10px] leading-snug">
        <p className="flex items-center gap-1.5">
          <Chip tone="bg-[var(--sky)]">Interview</Chip> <b>Thu 13 Nov, 10:00</b>
        </p>
        <p className="mt-1 text-[var(--ink2)]">Google Meet · 45 min</p>
        <div className="mt-1.5 flex gap-1 whitespace-nowrap">
          <span className="rounded-full bg-[var(--sky)] px-2 py-1 text-[8.5px] font-bold">＋ Google</span>
          <span className="rounded-full bg-[var(--lilac)] px-2 py-1 text-[8.5px] font-bold">＋ Apple</span>
        </div>
      </Tile>
      <Tile className="mt-2 text-[9.5px] leading-snug">
        <b>10 practice questions ready</b>
        <p className="mt-0.5 text-[var(--ink2)]">&ldquo;Tell us about a product you&apos;d improve, and how you&apos;d measure it.&rdquo;</p>
      </Tile>
    </>
  );
}

export function OfferScreen() {
  return (
    <>
      <Top title="rookie" light="Software Engineer Intern" sub="Madrid · Hybrid" />
      <div className="rounded-[18px] bg-[var(--mint)] px-3 py-4 text-center text-[var(--ink)]">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--good)]">Offer</p>
        <p className="mt-1 text-[20px] font-bold leading-tight">You landed the right one.</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] leading-tight">
        {[
          ["Start", "Feb 2027"],
          ["Length", "6 months"],
          ["Setup", "Hybrid"],
        ].map(([k, v]) => (
          <span key={k} className="rounded-[10px] bg-[var(--tile)] px-2 py-1.5">
            <span className="block text-[var(--mute)]">{k}</span>
            <b>{v}</b>
          </span>
        ))}
      </div>
      <Tile className="mt-2 text-[9.5px] leading-snug">
        <p className="flex items-center gap-1.5">
          <Chip tone="bg-[var(--peach)]">Next step</Chip> <b>Sign the contract by 29 Oct</b>
        </p>
      </Tile>
      <p className="mt-2.5 text-[10px] font-bold">Your journey</p>
      <div className="mt-1 grid gap-1.5 text-[10px]">
        {["Interested · 2 Oct", "Submitted · 4 Oct", "Assessment · 9 Oct", "Interview · 16 Oct", "Offer · 22 Oct"].map((t, i) => (
          <p key={t} className="flex items-center gap-2 text-[var(--ink2)]">
            <span className={`inline-block h-2 w-2 rounded-full ${i === 4 ? "bg-[var(--good)]" : "bg-[#c4c4c9]"}`} />
            <span className={i === 4 ? "font-bold text-[var(--ink)]" : ""}>{t}</span>
          </p>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <Act tone="bg-[var(--peach)]">Compare offers</Act>
        <Act tone="bg-[var(--lilac)]">＋ Calendar</Act>
      </div>
    </>
  );
}

export const SCREENS = [FindScreen, InterestedScreen, ApplyScreen, AssessmentScreen, InterviewScreen, OfferScreen];

export function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="phone mx-auto" role="img" aria-label={label}>
      <div className="phone-screen">{children}</div>
    </div>
  );
}
