import "server-only";
import { MODEL_FAST, generateJson } from "./gemini";
import { emailPrompt, emailSchema, emailSystem, noLongDashes, type EmailUpdate } from "./prompts";

/** Reads one email (or a few, joined) about a role and returns the suggested update, with dates checked. */
export async function readEmailUpdate(role: { title: string; company: string | null; role: string | null; status: string }, today: string, email: string) {
  const { data } = await generateJson<EmailUpdate>({
    model: MODEL_FAST(),
    system: emailSystem,
    prompt: emailPrompt([role.company ?? role.title, role.role].filter(Boolean).join(", "), role.status, today, email.slice(0, 8000)),
    schema: emailSchema,
  });
  const u = noLongDashes(data);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(u.event_at)) u.event_at = "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(u.deadline)) u.deadline = "";
  if (u.status === role.status) u.status = "no_change";
  return u;
}

/** True if the update would change something on the role. */
export const hasChanges = (u: EmailUpdate) =>
  u.found && (u.status !== "no_change" || (!!u.event_at && u.event_kind !== "none") || !!u.next_step || !!u.deadline);
