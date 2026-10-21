import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_FAST, generateJson } from "@/server/ai/gemini";
import { errorResponse, getProfile, getUser, consumeRun } from "@/server/ai/limits";
import { notify } from "@/server/notify";
import { TRACKS, analysisPrompt, analysisSchema, analysisSystem, noLongDashes, type Analysis } from "@/server/ai/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  let id: string | undefined;
  let isRescore = false;
  try {
    await getUser(supabase);
    // `rescore`: the profile changed, so score the role again from the description already read.
    const body = (await request.json()) as { id?: string; text?: string; rescore?: boolean };
    id = body.id;
    if (!id) throw new AiError("Missing role.", 400);

    const { data: row } = await supabase
      .from("applications")
      .select("id,job_url,job_text,job,score,verdict,company,title")
      .eq("id", id)
      .maybeSingle();
    if (!row) throw new AiError("Role not found.", 404);
    const saved = (row.job as { description?: string } | null)?.description ?? "";
    const rescore = !!body.rescore && !!(saved || row.job_text);
    const text = rescore ? row.job_text || saved : (body.text ?? "").trim() || row.job_text || "";
    if (!row.job_url && !text) throw new AiError("Add a job link or paste the description first.", 400);
    isRescore = rescore;

    await consumeRun(supabase, rescore ? "rescore" : "analyze");
    // A re-score keeps the card as it is while it runs; a first read shows "Reading the listing…".
    if (!rescore) await supabase.from("applications").update({ job_status: "reading", job_text: text || null }).eq("id", id);

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
      if (!rescore) await supabase.from("applications").update({ job_status: "failed" }).eq("id", id);
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
        // The AI only flags; the user decides on the Barriers page.
        verdict: a.verdict === "barrier" ? "barrier" : "open",
        ai_flag: a.verdict === "barrier" ? (a.flag === "deal_breaker" ? "deal_breaker" : "concern") : null,
        verdict_reason: a.verdict === "barrier" ? a.verdict_reason : null,
        job: { description: rescore && saved ? saved : a.description },
        job_status: "ready",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AiError(`Couldn't save the analysis: ${error.message}`);

    const name = updated.company ?? updated.title;
    const href = `/app/a/${id}`;
    if (!rescore) {
      await notify(supabase, {
        key: `analysed:${id}:${updated.analyzed_at}`,
        kind: "analysed",
        title: updated.verdict === "barrier" ? `${name}: check Barriers` : `${name} is ready: ${updated.score}/10`,
        body: updated.verdict === "barrier" ? (updated.verdict_reason ?? "It may clash with one of your barriers.") : (updated.why ?? ""),
        href: updated.verdict === "barrier" ? "/app/barriers" : href,
        application_id: id,
      });
    } else if (row.score !== updated.score || (row.verdict !== "barrier" && updated.verdict === "barrier")) {
      const up = (updated.score ?? 0) > (row.score ?? 0);
      await notify(supabase, {
        key: `score:${id}:${updated.analyzed_at}`,
        kind: "score",
        title:
          updated.verdict === "barrier" && row.verdict !== "barrier"
            ? `${name} now clashes with a barrier`
            : `${name}: ${row.score ?? "?"} → ${updated.score}/10 ${up ? "▲" : "▼"}`,
        body: `After your profile update. ${updated.why ?? ""}`.trim(),
        href: updated.verdict === "barrier" ? "/app/barriers" : href,
        application_id: id,
      });
    }
    return Response.json({ application: updated, changed: row.score !== updated.score });
  } catch (e) {
    // A failed re-score leaves the role as it was; only a failed first read marks it as failed.
    if (id && !isRescore && !(e instanceof AiError && [400, 401, 404, 429].includes(e.status))) {
      await supabase.from("applications").update({ job_status: "failed" }).eq("id", id);
    }
    return errorResponse(e);
  }
}
