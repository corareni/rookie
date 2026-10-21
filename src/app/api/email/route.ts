import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_FAST, generateJson } from "@/server/ai/gemini";
import { consumeRun, errorResponse, getUser } from "@/server/ai/limits";
import { emailPrompt, emailSchema, emailSystem, noLongDashes, type EmailUpdate } from "@/server/ai/prompts";

export const maxDuration = 60;

/** Reads a pasted email about one role and suggests the update. Saves nothing; the user decides. */
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { id, text, today } = (await request.json()) as { id?: string; text?: string; today?: string };
    if (!id) throw new AiError("Pick the role this email is about.", 400);
    const email = (text ?? "").trim();
    if (email.length < 20) throw new AiError("Paste the whole email, including the date and any times.", 400);
    const { data: row } = await supabase.from("applications").select("id,title,company,role,status").eq("id", id).maybeSingle();
    if (!row) throw new AiError("Role not found.", 404);

    // Counts towards the daily role-analysis allowance.
    await consumeRun(supabase, "analyze");
    const day = /^\d{4}-\d{2}-\d{2}$/.test(today ?? "") ? today! : new Date().toISOString().slice(0, 10);
    const { data } = await generateJson<EmailUpdate>({
      model: MODEL_FAST(),
      system: emailSystem,
      prompt: emailPrompt([row.company ?? row.title, row.role].filter(Boolean).join(", "), row.status, day, email.slice(0, 8000)),
      schema: emailSchema,
    });
    const u = noLongDashes(data);
    // Keep only well-formed dates.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(u.event_at)) u.event_at = "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(u.deadline)) u.deadline = "";
    if (u.status === row.status) u.status = "no_change";
    return Response.json(u);
  } catch (e) {
    return errorResponse(e);
  }
}
