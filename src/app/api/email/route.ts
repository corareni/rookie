import { createClient } from "@/lib/supabase/server";
import { AiError } from "@/server/ai/gemini";
import { readEmailUpdate } from "@/server/ai/email";
import { consumeRun, errorResponse, getPlan, getUser, requirePlan } from "@/server/ai/limits";

export const maxDuration = 60;

/** Reads a pasted email about one role and suggests the update. Saves nothing; the user decides. */
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    // Email updates are part of Premium.
    const plan = await getPlan(supabase);
    requirePlan(plan, "email");
    const { data: prefs } = await supabase.from("profiles").select("profile").maybeSingle();
    if ((prefs?.profile as { read_emails?: boolean } | null)?.read_emails === false)
      throw new AiError("Email reading is switched off on your Profile.", 403);
    const { id, text, today } = (await request.json()) as { id?: string; text?: string; today?: string };
    if (!id) throw new AiError("Pick the role this email is about.", 400);
    const email = (text ?? "").trim();
    if (email.length < 20) throw new AiError("Paste the whole email, including the date and any times.", 400);
    const { data: row } = await supabase.from("applications").select("id,title,company,role,status").eq("id", id).maybeSingle();
    if (!row) throw new AiError("Role not found.", 404);

    await consumeRun(supabase, "email", 1, plan);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(today ?? "") ? today! : new Date().toISOString().slice(0, 10);
    return Response.json(await readEmailUpdate(row, day, email));
  } catch (e) {
    return errorResponse(e);
  }
}
