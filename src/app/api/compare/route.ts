import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_WRITE, generateJson } from "@/server/ai/gemini";
import { errorResponse, getProfile, getUser, consumeRun } from "@/server/ai/limits";
import { comparePrompt, compareSchema, compareSystem, noLongDashes, type Comparison } from "@/server/ai/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { ids } = (await request.json()) as { ids?: string[] };
    const unique = [...new Set(ids ?? [])];
    if (unique.length < 2 || unique.length > 4) throw new AiError("Pick 2 to 4 roles to compare.", 400);

    const { data: rows } = await supabase
      .from("applications")
      .select("id,title,company,role,location,track,score,what,why,risk,timing,closes_note,deadline,job")
      .in("id", unique);
    if (!rows || rows.length !== unique.length) throw new AiError("Some of those roles weren't found.", 404);

    await consumeRun(supabase, "compare");
    const profile = await getProfile(supabase);
    const roles = rows.map((r) => ({
      id: r.id,
      company: r.company,
      role: r.role ?? r.title,
      location: r.location,
      score: r.score,
      what: r.what,
      why: r.why,
      catch: r.risk,
      timing: r.timing,
      deadline: r.deadline ?? r.closes_note,
      description: (r.job as { description?: string } | null)?.description?.slice(0, 2500),
    }));

    const { data } = await generateJson<Comparison>({
      model: MODEL_WRITE(),
      system: compareSystem,
      prompt: comparePrompt(roles, profile),
      schema: compareSchema,
    });

    const result = noLongDashes(data);
    const { data: saved, error } = await supabase
      .from("comparisons")
      .insert({ application_ids: unique, result })
      .select("id")
      .single();
    if (error) throw new AiError(`Couldn't save the comparison: ${error.message}`);
    return Response.json({ id: saved.id });
  } catch (e) {
    return errorResponse(e);
  }
}
