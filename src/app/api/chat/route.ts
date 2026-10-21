import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_WRITE, generateJson } from "@/server/ai/gemini";
import { consumeRun, errorResponse, getProfile, getUser } from "@/server/ai/limits";
import { chatPrompt, chatSchema, chatSystem, noLongDashes, type ChatReply } from "@/server/ai/prompts";

export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; text: string };

/** "Ask Rookie": answers questions using the user's own board and profile. Changes nothing; links to pages. */
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { messages, today } = (await request.json()) as { messages?: Msg[]; today?: string };
    const history = (messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
    if (history.at(-1)?.role !== "user") throw new AiError("Ask a question first.", 400);

    await consumeRun(supabase, "chat");
    const [{ data: roles }, { data: events }, profile] = await Promise.all([
      supabase
        .from("applications")
        .select("id,title,company,role,status,score,deadline,next_step,why,risk,verdict")
        .neq("verdict", "binned")
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase.from("applications").select("id,event_at,event_kind").not("event_at", "is", null),
      getProfile(supabase),
    ]);
    const ev = new Map((events ?? []).map((e) => [e.id, e]));
    const board = (roles ?? [])
      .map((r) => {
        const e = ev.get(r.id);
        return [
          `- id ${r.id}: ${r.company ?? r.title}${r.role ? `, ${r.role}` : ""}`,
          `status ${r.status}${r.verdict === "barrier" ? " (flagged on Barriers)" : ""}`,
          r.score ? `score ${r.score}/10` : "",
          r.deadline ? `deadline ${r.deadline}` : "",
          e?.event_at ? `${e.event_kind ?? "interview"} at ${e.event_at}` : "",
          r.next_step ? `next step: ${r.next_step}` : "",
          r.why ? `why: ${r.why.slice(0, 160)}` : "",
          r.risk ? `catch: ${r.risk.slice(0, 160)}` : "",
        ]
          .filter(Boolean)
          .join("; ");
      })
      .join("\n");

    const day = /^\d{4}-\d{2}-\d{2}$/.test(today ?? "") ? today! : new Date().toISOString().slice(0, 10);
    const { data } = await generateJson<ChatReply>({
      model: MODEL_WRITE(),
      system: chatSystem,
      prompt: chatPrompt(board, profile, day, history),
      schema: chatSchema,
    });
    const reply = noLongDashes(data);
    // Only links inside Rookie, and only to roles that exist.
    const ids = new Set((roles ?? []).map((r) => r.id));
    const links = (reply.links ?? [])
      .filter((l) => /^\/(app|profile)(\/|$|#)/.test(l.href) && !/[\s<>"']/.test(l.href))
      .filter((l) => !l.href.startsWith("/app/a/") || ids.has(l.href.slice(7).split(/[#?/]/)[0]))
      .slice(0, 4)
      .map((l) => ({ label: l.label.slice(0, 40), href: l.href }));
    return Response.json({ answer: reply.answer, links });
  } catch (e) {
    return errorResponse(e);
  }
}
