import { hasProfileContent } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_WRITE, generateJson } from "@/server/ai/gemini";
import { errorResponse, getProfile, getUser, consumeRun } from "@/server/ai/limits";
import {
  cvPrompt,
  cvSchema,
  cvSystem,
  letterPrompt,
  letterSchema,
  letterSystem,
  noLongDashes,
  type Letter,
  type TailoredCV,
} from "@/server/ai/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { id } = (await request.json()) as { id?: string };
    if (!id) throw new AiError("Missing role.", 400);

    const { data: row } = await supabase
      .from("applications")
      .select("id,title,company,role,location,what,timing,job,job_text")
      .eq("id", id)
      .maybeSingle();
    if (!row) throw new AiError("Role not found.", 404);

    const profile = await getProfile(supabase);
    if (!profile || !hasProfileContent(profile)) throw new AiError("Add your CV or profile first.", 400);

    const description = (row.job as { description?: string } | null)?.description || row.job_text || "";
    if (!description && !row.what) throw new AiError("Analyse the role first, or paste the job description.", 400);
    const job = [
      `Company: ${row.company ?? "Not stated"}`,
      `Role: ${row.role ?? row.title}`,
      `Location: ${row.location ?? "Not stated"}`,
      `Timing: ${row.timing ?? "Not stated"}`,
      `About: ${row.what ?? ""}`,
      `Listing:\n${description.slice(0, 6000)}`,
    ].join("\n");

    await consumeRun(supabase, "generate");
    const [cv, letter] = await Promise.all([
      generateJson<TailoredCV>({ model: MODEL_WRITE(), system: cvSystem, prompt: cvPrompt(job, profile), schema: cvSchema }),
      generateJson<Letter>({ model: MODEL_WRITE(), system: letterSystem, prompt: letterPrompt(job, profile), schema: letterSchema }),
    ]);

    const { changes, flags, ...cvContent } = noLongDashes(cv.data);
    const { used_company_facts, used_profile_facts, flags: letterFlags, ...letterContent } = noLongDashes(letter.data);

    const { error } = await supabase.from("documents").upsert(
      [
        { application_id: id, kind: "cv", content: cvContent, meta: { changes, flags }, edited: false },
        {
          application_id: id,
          kind: "cover_letter",
          content: letterContent,
          meta: { used_company_facts, used_profile_facts, flags: letterFlags },
          edited: false,
        },
      ],
      { onConflict: "application_id,kind" },
    );
    if (error) throw new AiError(`Couldn't save your documents: ${error.message}`);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
