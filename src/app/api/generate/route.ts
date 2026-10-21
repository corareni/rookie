import { language } from "@/lib/documents";
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
      which?: "both" | "cv" | "letter";
      language?: string;
    };
    const id = body.id;
    const which = body.which === "cv" || body.which === "letter" ? body.which : "both";
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
    const lang = language(body.language);
    const options: WriteOptions = {
      language: lang.label,
      style: ["concise", "story", "elaborate"].includes(body.style ?? "") ? body.style! : "story",
      length: ["short", "standard", "long"].includes(body.length ?? "") ? body.length! : "standard",
      facts: (body.facts ?? []).filter((f) => typeof f === "string").slice(0, 25).map((f) => f.slice(0, 300)),
      roleNotes: (row.notes ?? "").slice(0, 2000),
      styleRefs: (refs ?? []).map((r) => r.text).filter(Boolean),
    };

    await consumeRun(supabase, "generate");
    // Only write what was asked for: the CV, the letter, or both (in parallel).
    const [cv, letter] = await Promise.all([
      which !== "letter"
        ? generateJson<TailoredCV>({ model: MODEL_WRITE(), system: cvSystem, prompt: cvPrompt(job, profile, options), schema: cvSchema })
        : null,
      which !== "cv"
        ? generateJson<Letter>({ model: MODEL_WRITE(), system: letterSystem, prompt: letterPrompt(job, profile, options), schema: letterSchema })
        : null,
    ]);

    const rows = [];
    if (cv) {
      const { changes, flags, ...content } = noLongDashes(cv.data);
      rows.push({ application_id: id, kind: "cv", content: { ...content, lang: lang.v }, meta: { changes, flags }, edited: false });
    }
    if (letter) {
      const { used_company_facts, used_profile_facts, flags, ...content } = noLongDashes(letter.data);
      rows.push({ application_id: id, kind: "cover_letter", content: { ...content, lang: lang.v }, meta: { used_company_facts, used_profile_facts, flags }, edited: false });
    }
    const { error } = await supabase.from("documents").upsert(rows, { onConflict: "application_id,kind" });
    if (error) throw new AiError(`Couldn't save your documents: ${error.message}`);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
