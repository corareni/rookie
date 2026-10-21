import { createClient } from "@/lib/supabase/server";
import { hasChanges, readEmailUpdate } from "@/server/ai/email";
import { AiError } from "@/server/ai/gemini";
import { consumeRun, errorResponse, getUser } from "@/server/ai/limits";
import { gmailConfigured, readMessage, refreshAccess, searchCompany } from "@/server/gmail";
import { notify } from "@/server/notify";

export const maxDuration = 60;

const ACTIVE = ["submitted", "assessment", "interview", "offer"];
const ORDER = ["interested", "submitted", "assessment", "interview", "offer"];
const TERMINAL = ["rejected", "withdrawn"];
const rank = (s: string) => ORDER.indexOf(s);
const LABEL: Record<string, string> = { submitted: "Submitted", assessment: "Assessment", interview: "Interview", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn" };

/** "2026-10-28T10:00" in the user's time zone (offset in minutes, as from getTimezoneOffset) to UTC. */
function localToUtc(local: string, offset: number) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + offset * 60_000;
  return new Date(utc).toISOString();
}

/**
 * "Check emails": searches the connected Gmail for recent emails about each application, reads the new ones
 * and turns real updates into notifications with a suggested change. Nothing on the role changes by itself.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { data: prefs } = await supabase.from("profiles").select("profile").maybeSingle();
    if ((prefs?.profile as { read_emails?: boolean } | null)?.read_emails === false)
      throw new AiError("Email reading is switched off on your Profile.", 403);
    if (!gmailConfigured()) return Response.json({ state: "unavailable" });
    const { data: conn, error } = await supabase.from("gmail_connections").select("refresh_token,last_checked_at,seen,email").maybeSingle();
    if (error) return Response.json({ state: "unavailable" });
    if (!conn) return Response.json({ state: "connect" });

    const t = await refreshAccess(conn.refresh_token);
    if (!t.ok || !t.access_token) {
      // Access was removed in the Google account, or expired: connect again.
      await supabase.from("gmail_connections").delete().not("user_id", "is", null);
      return Response.json({ state: "connect", expired: true });
    }
    const access = t.access_token;

    const { today, tz } = (await request.json().catch(() => ({}))) as { today?: string; tz?: number };
    const tzOffset = Number.isFinite(tz) ? Math.max(-840, Math.min(840, Number(tz))) : 0;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(today ?? "") ? today! : new Date().toISOString().slice(0, 10);
    const since = conn.last_checked_at ? Math.ceil((Date.now() - Date.parse(conn.last_checked_at)) / 86_400_000) + 1 : 30;
    const days = Math.min(30, Math.max(2, since));

    const { data: roles } = await supabase
      .from("applications")
      .select("id,title,company,role,status")
      .in("status", ACTIVE)
      .not("company", "is", null)
      .order("updated_at", { ascending: false })
      .limit(12);

    const seen = new Set<string>(conn.seen ?? []);
    // The newest email behind an update, so the Applications page can link straight to it in Gmail.
    const mailRef = (msgs: { id: string; date: string }[]) => {
      const newest = [...msgs].sort((a, b) => b.date.localeCompare(a.date))[0];
      return newest ? { id: newest.id, account: conn.email ?? null } : null;
    };
    let emails = 0;
    let updates = 0;
    let applied = 0;
    let limited = false;

    // A few roles at a time keeps the check inside the time limit.
    const list = roles ?? [];
    for (let i = 0; i < list.length; i += 4) {
      await Promise.all(
        list.slice(i, i + 4).map(async (r) => {
          const ids = (await searchCompany(access, r.company!, days).catch(() => [])).filter((id) => !seen.has(id));
          if (!ids.length) return;
          ids.forEach((id) => seen.add(id));
          const msgs = await Promise.all(ids.map((id) => readMessage(access, id).catch(() => null)));
          const found = msgs.filter((m): m is NonNullable<typeof m> => !!m);
          if (!found.length) return;
          emails += found.length;
          try {
            await consumeRun(supabase, "email");
          } catch (e) {
            if (e instanceof AiError && e.status === 429) limited = true;
            return;
          }
          // Oldest first, so the latest email decides the stage.
          const text = found
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((m) => m.text)
            .join("\n\n---\n\n");
          const u = await readEmailUpdate(r, day, text).catch(() => null);
          if (!u || !hasChanges(u)) return;
          updates++;
          // Clear progress (forward to a later stage, or rejected / withdrawn) is applied straight away; anything
          // else (moving back, no stage change) stays a suggestion to review in the bell.
          const auto = u.status !== "no_change" && (TERMINAL.includes(u.status) || rank(u.status) > rank(r.status));
          if (auto) {
            const patch: Record<string, unknown> = { status: u.status };
            if (u.event_at && u.event_kind !== "none") {
              const at = localToUtc(u.event_at, tzOffset);
              if (at) Object.assign(patch, { event_at: at, event_kind: u.event_kind, event_minutes: Math.min(720, Math.max(5, u.event_minutes || 60)), event_location: u.event_location || null });
            }
            if (u.next_step) patch.next_step = u.next_step;
            if (u.deadline) patch.deadline = u.deadline;
            const { error } = await supabase.from("applications").update(patch).eq("id", r.id);
            if (!error) applied++;
            await notify(supabase, {
              key: `email:${r.id}:${found.map((m) => m.id).sort().join(",")}`.slice(0, 300),
              kind: "email",
              title: `${r.company}: moved to ${LABEL[u.status] ?? u.status}`,
              body: `From an email. ${u.summary}`,
              href: `/app/a/${r.id}`,
              application_id: r.id,
              data: { applied: !error, from: r.status, suggestion: u, mail: mailRef(found) },
            });
            return;
          }
          await notify(supabase, {
            key: `email:${r.id}:${found.map((m) => m.id).sort().join(",")}`.slice(0, 300),
            kind: "email",
            title: `Email from ${r.company}`,
            body: u.summary,
            href: `/app/a/${r.id}#email`,
            application_id: r.id,
            data: { suggestion: u, mail: mailRef(found) },
          });
        }),
      );
    }

    await supabase
      .from("gmail_connections")
      .update({ last_checked_at: new Date().toISOString(), seen: [...seen].slice(-500) })
      .not("user_id", "is", null);
    return Response.json({ state: "done", roles: list.length, emails, updates, applied, limited });
  } catch (e) {
    return errorResponse(e);
  }
}
