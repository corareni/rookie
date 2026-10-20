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
  type WriteOptions,
} from "@/server/ai/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const body = (await request.json()) as {
      id?: string;
      style?: WriteOptions["style"];
      length?: WriteOptions["length"];
      facts?: string[];
    };
    const id = body.id;
    if (!id) throw new AiError("Missing role.", 400);

    const { data: row } = await supabase
      .from("applications")
      .select("id,title,company,role,location,what,timing,job,job_text,notes")
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

    // The user's own letters (if they uploaded any) shape tone only; the library may not exist yet.
    const { data: refs } = await supabase
      .from("library_files")
      .select("text")
      .eq("kind", "cover_letter")
      .order("created_at", { ascending: false })
      .limit(2);
    const options: WriteOptions = {
      style: ["concise", "story", "elaborate"].includes(body.style ?? "") ? body.style! : "story",
      length: ["short", "standard", "long"].includes(body.length ?? "") ? body.length! : "standard",
      facts: (body.facts ?? []).filter((f) => typeof f === "string").slice(0, 25).map((f) => f.slice(0, 300)),
      roleNotes: (row.notes ?? "").slice(0, 2000),
      styleRefs: (refs ?? []).map((r) => r.text).filter(Boolean),
    };

    await consumeRun(supabase, "generate");
    const [cv, letter] = await Promise.all([
      generateJson<TailoredCV>({ model: MODEL_WRITE(), system: cvSystem, prompt: cvPrompt(job, profile, options), schema: cvSchema }),
      generateJson<Letter>({ model: MODEL_WRITE(), system: letterSystem, prompt: letterPrompt(job, profile, options), schema: letterSchema }),
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
