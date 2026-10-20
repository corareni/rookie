import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_WRITE, generateJson } from "@/server/ai/gemini";
import { consumeRun, errorResponse, getProfile, getUser } from "@/server/ai/limits";
import { interviewPrompt, interviewSchema, interviewSystem, noLongDashes, type InterviewPrep } from "@/server/ai/prompts";

export const maxDuration = 60;

/** Practice questions for a role in the interview or assessment stage. `more: true` asks for new ones. */
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { id, more } = (await request.json()) as { id?: string; more?: boolean; previous?: string[] };
    if (!id) throw new AiError("Missing role.", 400);
    const { data: row } = await supabase
      .from("applications")
      .select("id,title,company,role,location,what,job,job_text,notes")
      .eq("id", id)
      .maybeSingle();
    if (!row) throw new AiError("Role not found.", 404);

    // Earlier questions (if saved) are passed on so "More questions" gives new ones.
    const { data: prev } = await supabase.from("applications").select("interview_prep").eq("id", id).maybeSingle();
    const before = ((prev?.interview_prep as InterviewPrep | null)?.questions ?? []).map((q) => q.q);

    await consumeRun(supabase, "interview");
    const profile = await getProfile(supabase);
    const description = (row.job as { description?: string } | null)?.description || row.job_text || "";
    const job = [`Company: ${row.company ?? "Not stated"}`, `Role: ${row.role ?? row.title}`, `About: ${row.what ?? ""}`, `Listing:\n${description.slice(0, 5000)}`].join("\n");

    const { data } = await generateJson<InterviewPrep>({
      model: MODEL_WRITE(),
      system: interviewSystem,
      prompt: interviewPrompt(job, profile, row.notes ?? "", more ? before : []),
      schema: interviewSchema,
    });
    const prep = noLongDashes(data);
    const saved = more ? { questions: [...prep.questions, ...((prev?.interview_prep as InterviewPrep | null)?.questions ?? [])] } : prep;
    // Saving needs the Phase 4 column; if it isn't there yet the questions are still returned.
    await supabase.from("applications").update({ interview_prep: saved }).eq("id", id);
    return Response.json(saved);
  } catch (e) {
    return errorResponse(e);
  }
}
