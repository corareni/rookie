// Phone screens for the landing page. All data is clearly example data.

function Top({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-[#8e9191]" aria-hidden="true">
        <span>←</span>
        <span className="text-[11px]">Rookie</span>
      </div>
      <p className="mt-3 text-[15px] font-bold">{title}</p>
      {sub && <p className="muted text-[11px]">{sub}</p>}
    </div>
  );
}

const Chip = ({ children, lime }: { children: React.ReactNode; lime?: boolean }) => (
  <span
    className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${lime ? "bg-[var(--lime)] text-[var(--ink)]" : "bg-[#2a2c2c] text-white"}`}
  >
    {children}
  </span>
);

export function FindScreen() {
  return (
    <>
      <Top title="Add a role" sub="Paste any job link" />
      <div className="tile text-[11px] text-[#cfd1d1]">careers.example.com/jobs/analyst-intern</div>
      <div className="lime-btn mt-2">Add</div>
      <div className="tile mt-4">
        <p className="flex items-center gap-2 text-[11px] text-[#cfd1d1]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--lime)]" /> Reading the listing…
        </p>
        <div className="mt-3 grid gap-1.5" aria-hidden="true">
          <span className="h-2 w-4/5 rounded bg-[#3a3c3c]" />
          <span className="h-2 w-3/5 rounded bg-[#3a3c3c]" />
          <span className="h-2 w-2/3 rounded bg-[#3a3c3c]" />
        </div>
      </div>
      <p className="muted mt-auto text-[10.5px]">Company, role, location, deadline and timing filled in for you.</p>
    </>
  );
}

export function InterestedScreen() {
  return (
    <>
      <Top title="Example Bank" sub="Analyst Intern · Madrid (hybrid)" />
      <div className="flex items-end gap-2">
        <span className="text-[44px] font-bold leading-none">7</span>
        <span className="muted mb-1 text-[12px]">/10 your chance</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip>Finance & banking</Chip>
        <Chip lime>Closes in 9 days</Chip>
      </div>
      <div className="tile mt-3 grid gap-2 text-[11px] leading-snug">
        <p>
          <b>Why you:</b> <span className="text-[#cfd1d1]">your data course and part-time ops role match the brief.</span>
        </p>
        <p>
          <b>The catch:</b> <span className="text-[#cfd1d1]">asks for Excel modelling you don&apos;t show yet.</span>
        </p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <div className="tile text-center text-[11px]">+ Compare</div>
        <div className="lime-btn !py-2.5 text-[11px]">CV + letter</div>
      </div>
    </>
  );
}

export function ApplyScreen() {
  return (
    <>
      <Top title="Your cover letter" sub="Tailored to Example Bank" />
      <div className="rounded-xl bg-white p-3 font-serif text-[9.5px] leading-[1.45] text-black">
        <p className="text-center text-[10px] font-bold tracking-wide">ALEX MORGAN</p>
        <p className="mt-2 font-bold">Re: Analyst Intern</p>
        <p className="mt-1.5">Dear Hiring Team,</p>
        <p className="mt-1.5">
          Last spring I rebuilt our club&apos;s budget in a spreadsheet nobody had touched in years. It was the first time I
          saw numbers change a decision…
        </p>
        <p className="mt-1.5 text-[#666]">…</p>
      </div>
      <div className="tile mt-2 text-[10.5px] text-[#cfd1d1]">✓ Only facts from your CV · 312 words</div>
      <div className="lime-btn mt-auto">Download PDF</div>
    </>
  );
}

export function AssessmentScreen() {
  return (
    <>
      <Top title="Applied 6." sub="Where everything stands" />
      {[
        ["Example Bank", "Assessment", "Online test by Fri", true],
        ["Example Studio", "Submitted", "Wait for reply", false],
        ["Example Group", "Submitted", "Sent 12 Oct", false],
      ].map(([c, s, n, hot]) => (
        <div key={c as string} className="tile mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold">{c}</span>
            <Chip lime={hot as boolean}>{s}</Chip>
          </div>
          <p className="muted mt-1 text-[10.5px]">{n}</p>
        </div>
      ))}
      <p className="muted mt-auto text-[10.5px]">Deadlines and next steps for every application.</p>
    </>
  );
}

export function InterviewScreen() {
  return (
    <>
      <Top title="Best pick: Example Bank." sub="Comparing 3 roles" />
      {[
        ["01", "Example Bank", 7],
        ["02", "Example Group", 6],
        ["03", "Example Studio", 4],
      ].map(([n, c, s]) => (
        <div key={c as string} className={`mb-2 flex items-center justify-between rounded-[14px] px-3 py-2.5 ${n === "01" ? "bg-[var(--lime)] text-[var(--ink)]" : "bg-[#2a2c2c]"}`}>
          <span className="text-[11.5px] font-semibold">
            {n} · {c}
          </span>
          <span className="text-[12px] font-bold">{s}/10</span>
        </div>
      ))}
      <div className="tile mt-1 text-[10.5px] leading-snug text-[#cfd1d1]">
        <b className="text-white">Interview Thu 10:00.</b> Pros, cons and how you fit, side by side, so you know what to
        say.
      </div>
    </>
  );
}

export function OfferScreen() {
  return (
    <>
      <Top title="Example Bank" sub="Analyst Intern" />
      <div className="mt-6 text-center">
        <span className="inline-block rounded-full bg-[var(--lime)] px-4 py-1.5 text-[13px] font-bold text-[var(--ink)]">Offer</span>
        <p className="mt-4 text-[22px] font-bold leading-tight">You landed the right one.</p>
      </div>
      <div className="mt-6 grid gap-1.5 text-[11px]">
        {["Interested · 2 Oct", "Submitted · 4 Oct", "Assessment · 9 Oct", "Interview · 16 Oct", "Offer · 22 Oct"].map((t) => (
          <p key={t} className="flex items-center gap-2 text-[#cfd1d1]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--lime)]" /> {t}
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
      {children}
    </div>
  );
}
