import type { Metadata } from "next";
import Link from "next/link";
import AnalysisPanel from "@/components/AnalysisPanel";
import ApplicationEditor from "@/components/ApplicationEditor";
import Documents from "@/components/Documents";
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

  const [{ data }, { data: docs }, { data: profile }, { count }, { data: prep }] = await Promise.all([
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
    <ApplicationEditor initial={a}>
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
      />
      {(a.status === "interview" || a.status === "assessment") && (
        <InterviewPrep
          id={a.id}
          stage={a.status}
          initial={((prep?.interview_prep as { questions?: [] } | null)?.questions ?? []) as never[]}
        />
      )}
    </ApplicationEditor>
  );
}
