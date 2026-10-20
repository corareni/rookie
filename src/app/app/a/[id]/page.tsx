import type { Metadata } from "next";
import Link from "next/link";
import AnalysisPanel from "@/components/AnalysisPanel";
import ApplicationEditor from "@/components/ApplicationEditor";
import Documents from "@/components/Documents";
import { COLUMNS, type Application } from "@/lib/applications";
import type { CvContent, Doc, LetterContent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Role · Rookie" };

const DAILY_GENERATE = 6;

export default async function ApplicationPage({ params }: PageProps<"/app/a/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [{ data }, { data: docs }, { data: profile }, { count }] = await Promise.all([
    supabase.from("applications").select(COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("documents").select("kind,content,meta,edited").eq("application_id", id),
    supabase.from("profiles").select("cv_text,contact").maybeSingle(),
    supabase
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("kind", "generate")
      .gte("created_at", today.toISOString()),
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
  const doc = <T,>(kind: string) => (docs?.find((d) => d.kind === kind) as Doc<T>) ?? null;

  return (
    <ApplicationEditor initial={a}>
      <AnalysisPanel a={a} />
      <Documents
        applicationId={a.id}
        cv={doc<CvContent>("cv")}
        letter={doc<LetterContent>("cover_letter")}
        hasCv={!!profile?.cv_text?.trim()}
        canGenerate={a.job_status === "ready"}
        left={Math.max(0, DAILY_GENERATE - (count ?? 0))}
        signature={(profile?.contact as { name?: string } | null)?.name ?? ""}
      />
    </ApplicationEditor>
  );
}
