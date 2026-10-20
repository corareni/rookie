import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_FAST, generateJson } from "@/server/ai/gemini";
import { errorResponse, getProfile, getUser, useRun } from "@/server/ai/limits";
import { TRACKS, analysisPrompt, analysisSchema, analysisSystem, noLongDashes, type Analysis } from "@/server/ai/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  let id: string | undefined;
  try {
    await getUser(supabase);
    const body = (await request.json()) as { id?: string; text?: string };
    id = body.id;
    if (!id) throw new AiError("Missing role.", 400);

    const { data: row } = await supabase.from("applications").select("id,job_url,job_text").eq("id", id).maybeSingle();
    if (!row) throw new AiError("Role not found.", 404);
    const text = (body.text ?? "").trim() || row.job_text || "";
    if (!row.job_url && !text) throw new AiError("Add a job link or paste the description first.", 400);

    await useRun(supabase, "analyze");
    await supabase.from("applications").update({ job_status: "reading", job_text: text || null }).eq("id", id);

    const profile = await getProfile(supabase);
    const today = new Date().toISOString().slice(0, 10);
    const { data, urlFailed } = await generateJson<Analysis>({
      model: MODEL_FAST(),
      system: analysisSystem,
      prompt: analysisPrompt({ url: text ? undefined : row.job_url!, text: text || undefined, profile, today }),
      schema: analysisSchema,
      readUrls: !text,
    });

    if (urlFailed || !data.is_job_ad) {
      await supabase.from("applications").update({ job_status: "failed" }).eq("id", id);
      return Response.json(
        { error: "Couldn't read this page. Open the role and paste the job description instead." },
        { status: 422 },
      );
    }

    const a = noLongDashes(data);
    const closes = a.closes && /^\d{4}-\d{2}-\d{2}$/.test(a.closes) ? a.closes : null;
    const { data: updated, error } = await supabase
      .from("applications")
      .update({
        company: a.company?.slice(0, 200) || null,
        role: a.role?.slice(0, 300) || null,
        location: a.location?.slice(0, 200) || null,
        track: TRACKS.includes(a.track) ? a.track : "Other",
        score: Math.min(10, Math.max(1, Math.round(a.score || 1))),
        what: a.what,
        why: a.why,
        risk: a.risk,
        timing: a.timing,
        closes_note: a.closes_note,
        ...(closes ? { deadline: closes } : {}),
        verdict: ["open", "barrier", "ruled_out"].includes(a.verdict) ? a.verdict : "open",
        verdict_reason: a.verdict === "open" ? null : a.verdict_reason,
        job: { description: a.description },
        job_status: "ready",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AiError(`Couldn't save the analysis: ${error.message}`);
    return Response.json({ application: updated });
  } catch (e) {
    if (id && !(e instanceof AiError && [400, 401, 404].includes(e.status))) {
      await supabase.from("applications").update({ job_status: "failed" }).eq("id", id);
    }
    return errorResponse(e);
  }
}
