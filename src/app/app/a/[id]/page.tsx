import type { Metadata } from "next";
import Link from "next/link";
import AnalysisPanel from "@/components/AnalysisPanel";
import ApplicationEditor from "@/components/ApplicationEditor";
import Documents from "@/components/Documents";
import EmailUpdate from "@/components/EmailUpdate";
import EventPanel, { type EventFields } from "@/components/EventPanel";
import InterviewPrep from "@/components/InterviewPrep";
import { COLUMNS, type Application } from "@/lib/applications";
import type { CvContent, Doc, LetterContent } from "@/lib/documents";
import { PROFILE_COLUMNS, hasProfileContent, profileAsText, toProfileData } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Role · Rookie" };

const DAILY_GENERATE = 6;

export default async function ApplicationPage({ params }: PageProps<"/app/a/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [{ data }, { data: docs }, { data: profile }, { count }, { data: prep }, evq] = await Promise.all([
    supabase.from("applications").select(COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("documents").select("kind,content,meta,edited").eq("application_id", id),
    supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle(),
    supabase
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("kind", "generate")
      .gte("created_at", today.toISOString()),
    // Needs the Phase 4 column; if it's missing this is simply empty.
    supabase.from("applications").select("interview_prep").eq("id", id).maybeSingle(),
    // Needs the Phase 5 columns; if they're missing the panel says so.
    supabase.from("applications").select("event_at,event_minutes,event_location,event_kind").eq("id", id).maybeSingle(),
  ]);

  if (!data) {
    return (
      <main className="pt-10">
        <p className="text-lg font-semibold">This role doesn&apos;t exist or isn&apos;t yours.</p>
        <Link href="/app" className="mt-3 inline-block font-semibold">
          Back to your board
        </Link>
      </main>
    );
  }
  const a = data as unknown as Application;
  const pd = profile ? toProfileData(profile) : null;
  // Each line of the profile becomes a pickable fact ("- Automated…", "Skills: …"), minus headings.
  const facts = pd
    ? [...profileAsText(pd).split("\n"), ...pd.story_points.map((s) => `Story: ${s}`)]
        .map((l) => l.replace(/^- /, "").trim())
        .filter((l) => l.length > 12 && l !== l.toUpperCase())
    : [];
  const doc = <T,>(kind: string) => (docs?.find((d) => d.kind === kind) as Doc<T>) ?? null;

  return (
    <ApplicationEditor initial={a} event={(evq.data as EventFields | null) ?? null}>
      {(a.status === "interview" || a.status === "assessment" || evq.data?.event_at) && (
        <EventPanel
          key={a.status}
          app={a}
          ready={!evq.error}
          initial={(evq.data as EventFields | null) ?? { event_at: null, event_minutes: 60, event_location: null, event_kind: null }}
        />
      )}
      <AnalysisPanel a={a} />
      <Documents
        applicationId={a.id}
        cv={doc<CvContent>("cv")}
        letter={doc<LetterContent>("cover_letter")}
        hasCv={!!profile && hasProfileContent(toProfileData(profile))}
        canGenerate={a.job_status === "ready"}
        left={Math.max(0, DAILY_GENERATE - (count ?? 0))}
        signature={(profile?.contact as { name?: string } | null)?.name ?? ""}
        facts={[...new Set(facts)].slice(0, 80)}
        notes={a.notes ?? ""}
      />
      {(a.status === "interview" || a.status === "assessment") && (
        <InterviewPrep
          id={a.id}
          stage={a.status}
          initial={((prep?.interview_prep as { questions?: [] } | null)?.questions ?? []) as never[]}
        />
      )}
      {(
        <section id="email" className="mt-8 scroll-mt-20" aria-labelledby="email-h">
          <h2 id="email-h" className="sec">
            <small>[ ]</small> Got an email? <span className="font-light text-[var(--mute)]">· Rookie updates the status for you</span>
          </h2>
          <div className="tile tile-butter mt-3">
            <EmailUpdate
              fixed
              roles={[{ ...a, event_at: evq.data?.event_at ?? null, event_kind: (evq.data?.event_kind as EventFields["event_kind"]) ?? null }]}
            />
          </div>
        </section>
      )}
    </ApplicationEditor>
  );
}
