// Phone screens for the landing page, in Rookie's own look: light screen, grey tiles, pastel accents.
// Companies are real, the data is an illustration (labelled "Example"); letter badges, never logos.

const COMPANIES = {
  google: { name: "Google", letter: "G", tone: "bg-[var(--sky)]" },
  santander: { name: "Santander", letter: "S", tone: "bg-[var(--peach)]" },
  spotify: { name: "Spotify", letter: "S", tone: "bg-[var(--mint)]" },
  apple: { name: "Apple", letter: "A", tone: "bg-[var(--lilac)]" },
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

function Top({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between" aria-hidden="true">
        <span className="text-[14px] font-bold tracking-[-0.04em]">
          rookie<span className="text-[#9b8cf0]">.</span>
        </span>
        <span className="rounded-full bg-[var(--tile)] px-2 py-0.5 text-[9.5px] uppercase tracking-wide text-[var(--mute)]">Example</span>
      </div>
      <p className="mt-3 text-[15px] font-bold leading-tight tracking-tight">{title}</p>
      {sub && <p className="text-[11px] text-[var(--mute)]">{sub}</p>}
    </div>
  );
}

const Chip = ({ children, tone = "bg-white" }: { children: React.ReactNode; tone?: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-[var(--ink)] ${tone}`}>{children}</span>
);

const Tile = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-[14px] bg-[var(--tile)] p-2.5 ${className}`}>{children}</div>
);

const Btn = ({ children, tone = "bg-[var(--ink)] text-white" }: { children: React.ReactNode; tone?: string }) => (
  <div className={`rounded-full px-3 py-2 text-center text-[11px] font-bold ${tone}`}>{children}</div>
);

export function FindScreen() {
  return (
    <>
      <Top title="Add a role" sub="Paste any job link" />
      <Tile className="!bg-[var(--lilac)]">
        <p className="truncate rounded-full bg-white px-3 py-2 text-[10.5px] text-[var(--ink2)]">careers.google.com/jobs/apm-intern</p>
        <div className="mt-2">
          <Btn>Add</Btn>
        </div>
      </Tile>
      <Tile className="mt-3">
        <div className="flex items-center gap-2">
          <Badge co="google" />
          <div className="min-w-0">
            <p className="text-[12px] font-bold">Google</p>
            <p className="truncate text-[10.5px] text-[var(--ink2)]">Associate Product Manager Intern</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip>Zurich</Chip>
          <Chip>Summer 2027</Chip>
          <Chip tone="bg-[var(--butter)]">Closes 14 Nov</Chip>
        </div>
      </Tile>
      <p className="mt-auto text-[10.5px] text-[var(--mute)]">Company, role, location, timing and deadline, filled in for you.</p>
    </>
  );
}

export function InterestedScreen() {
  return (
    <>
      <Top title="Google" sub="Associate Product Manager Intern · Zurich" />
      <Tile className="flex items-end justify-between !bg-[var(--mint)]">
        <span>
          <span className="text-[40px] font-bold leading-none tracking-[-0.04em]">8</span>
          <span className="text-[12px] text-[var(--ink2)]">/10</span>
        </span>
        <span className="pb-1 text-right text-[10.5px] text-[var(--ink2)]">
          your chance,
          <br />
          honestly
        </span>
      </Tile>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[9.5px] leading-tight">
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
      <Tile className="mt-2 grid gap-1.5 text-[10px] leading-snug">
        <p>
          <b>Why you:</b>{" "}
          <span className="text-[var(--ink2)]">
            product sense from building your app project, data work at your internship, and German and English for a team
            spread across Europe.
          </span>
        </p>
        <p>
          <b>The catch:</b>{" "}
          <span className="text-[var(--ink2)]">
            they ask for SQL you only show at a basic level, and most hires have a technical degree. Lead with your
            dashboards.
          </span>
        </p>
      </Tile>
      <div className="mt-2 rounded-[14px] bg-[var(--butter)] p-2.5 text-[10px] leading-snug">
        <b>Notes for your CV and letter</b>
        <p className="mt-0.5 text-[var(--ink2)]">Met their recruiter at the IE career fair. Mention the n8n automation project.</p>
      </div>
      <div className="mt-auto grid grid-cols-[auto_1fr] gap-2 whitespace-nowrap">
        <Btn tone="bg-[var(--tile)] text-[var(--ink)]">+ Compare</Btn>
        <Btn>CV and Cover Letter</Btn>
      </div>
    </>
  );
}

export function ApplyScreen() {
  return (
    <>
      <Top title="Your application" sub="Tailored to Google" />
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-full bg-[var(--tile)] p-1 text-center text-[10.5px]">
        <span className="rounded-full bg-[var(--lilac)] py-1 font-bold">Cover Letter</span>
        <span className="py-1 text-[var(--ink2)]">CV</span>
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-white p-3 font-serif text-[9px] leading-[1.45] text-black">
        <p className="text-center text-[10px] font-bold tracking-wide">CORALIE AFFELD</p>
        <p className="mt-0.5 border-b border-black pb-1 text-center text-[7.5px]">Madrid, Spain | linkedin.com/in/coralie-affeld</p>
        <p className="mt-2 font-bold">Re: Associate Product Manager Intern</p>
        <p className="mt-1">Dear Hiring Team,</p>
        <p className="mt-1">
          The first product I shipped was a ride-sharing app for my campus. Watching students actually use it taught me
          more than any lecture…
        </p>
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--mute)]">Only facts from your profile · 1 page</p>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Btn tone="bg-[var(--mint)] text-[var(--ink)]">↓ PDF</Btn>
        <Btn tone="bg-[var(--lilac)] text-[var(--ink)]">↓ Word</Btn>
      </div>
    </>
  );
}

export function AssessmentScreen() {
  const rows: [Co, string, string, string, string][] = [
    ["santander", "Graduate Analyst, Corporate Banking", "Assessment", "Online test by Friday", "bg-[var(--butter)]"],
    ["google", "APM Intern", "Submitted", "Sent 2 Nov", "bg-white"],
    ["spotify", "Marketing Intern", "Submitted", "Sent 30 Oct", "bg-white"],
  ];
  return (
    <>
      <Top title="Applied 3." sub="Where everything stands" />
      <div className="grid gap-2">
        {rows.map(([co, role, status, next, tone]) => (
          <Tile key={co} className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Badge co={co} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold">{COMPANIES[co].name}</p>
                <p className="truncate text-[10px] text-[var(--ink2)]">{role}</p>
              </div>
            </div>
            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-[10px] text-[var(--mute)]">Next: {next}</p>
              <Chip tone={tone}>{status}</Chip>
            </div>
          </Tile>
        ))}
      </div>
      <p className="mt-auto text-[10.5px] text-[var(--mute)]">Tests, deadlines and next steps for every application.</p>
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
      <Top title="Best pick: Google." sub="Comparing 3 roles" />
      <div className="grid gap-2">
        {rows.map(([co, s], i) => (
          <div
            key={co}
            className={`flex items-center gap-2 rounded-[14px] px-2.5 py-2 ${i === 0 ? "bg-[var(--lilac)]" : "bg-[var(--tile)]"}`}
          >
            <span className="text-[10px] text-[var(--mute)]">0{i + 1}</span>
            <Badge co={co} size={24} />
            <span className="flex-1 text-[11.5px] font-bold">{COMPANIES[co].name}</span>
            <span className="text-[12px] font-bold">{s}/10</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] leading-snug">
        <Tile className="!bg-[var(--mint)]">
          <b>Pros</b>
          <p className="text-[var(--ink2)]">Product role, strong mentoring</p>
        </Tile>
        <Tile className="!bg-[var(--peach)]">
          <b>Cons</b>
          <p className="text-[var(--ink2)]">Relocation to Zurich</p>
        </Tile>
      </div>
      <Tile className="mt-2 text-[10.5px]">
        <b>Interview Thursday, 10:00.</b> <span className="text-[var(--ink2)]">10 practice questions ready.</span>
      </Tile>
    </>
  );
}

export function OfferScreen() {
  return (
    <>
      <Top title="Google" sub="Associate Product Manager Intern" />
      <div className="mt-2 rounded-[18px] bg-[var(--mint)] px-3 py-5 text-center text-[var(--ink)]">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--good)]">Offer</p>
        <p className="mt-1 text-[22px] font-bold leading-tight">You landed the right one.</p>
      </div>
      <div className="mt-4 grid gap-1.5 text-[10.5px]">
        {["Interested · 2 Oct", "Submitted · 4 Oct", "Assessment · 9 Oct", "Interview · 16 Oct", "Offer · 22 Oct"].map((t, i) => (
          <p key={t} className="flex items-center gap-2 text-[var(--ink2)]">
            <span className={`inline-block h-2 w-2 rounded-full ${i === 4 ? "bg-[var(--good)]" : "bg-[#c4c4c9]"}`} />
            <span className={i === 4 ? "font-bold text-[var(--ink)]" : ""}>{t}</span>
          </p>
        ))}
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
