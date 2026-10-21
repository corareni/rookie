import { gmailLink } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";
import { hasChanges, readEmailUpdate } from "@/server/ai/email";
import { AiError, MODEL_FAST, generateJson } from "@/server/ai/gemini";
import { consumeRun, errorResponse, getUser } from "@/server/ai/limits";
import { forAccount, gmailConfigured, listAccounts, readMessage, refreshAccess, searchApplications, searchCompany } from "@/server/gmail";
import { discoverPrompt, discoverSchema, discoverSystem, noLongDashes, type FoundApplication } from "@/server/ai/prompts";
import { notify } from "@/server/notify";

export const maxDuration = 60;

const ACTIVE = ["submitted", "assessment", "interview", "offer"];
const ORDER = ["interested", "submitted", "assessment", "interview", "offer"];
const TERMINAL = ["rejected", "withdrawn"];
const rank = (s: string) => ORDER.indexOf(s);
const LABEL: Record<string, string> = { submitted: "Submitted", assessment: "Assessment", interview: "Interview", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn" };

/** Status, interview or test date, next step and deadline from an email, ready to save on a role. */
function updatePatch(
  status: string,
  u: { event_at: string; event_kind: string; event_minutes: number; event_location: string; next_step: string; deadline: string },
  tz = 0,
) {
  const patch: Record<string, unknown> = { status };
  if (u.event_at && u.event_kind !== "none") {
    const at = localToUtc(u.event_at, tz);
    if (at) Object.assign(patch, { event_at: at, event_kind: u.event_kind, event_minutes: Math.min(720, Math.max(5, u.event_minutes || 60)), event_location: u.event_location || null });
  }
  if (u.next_step) patch.next_step = u.next_step.slice(0, 200);
  if (/^\d{4}-\d{2}-\d{2}$/.test(u.deadline)) patch.deadline = u.deadline;
  return patch;
}

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
    const { accounts: all, error } = await listAccounts(supabase);
    if (error) return Response.json({ state: "unavailable" });
    if (!all.length) return Response.json({ state: "connect" });

    const { today, tz, account } = (await request.json().catch(() => ({}))) as { today?: string; tz?: number; account?: string };
    // One account (?account=id) or all of them at once.
    const picked = all.filter((a) => !account || account === "all" || (a.id ?? "only") === account);

    // A working key per account; an account whose access was removed or expired is dropped.
    const live: { a: (typeof all)[number]; access: string; seen: Set<string> }[] = [];
    let expired = 0;
    for (const a of picked) {
      const t = await refreshAccess(a.refresh_token);
      if (!t.ok || !t.access_token) {
        expired++;
        await forAccount(supabase.from("gmail_connections").delete(), a);
        continue;
      }
      live.push({ a, access: t.access_token, seen: new Set(a.seen ?? []) });
    }
    if (!live.length) return Response.json({ state: "connect", expired: expired > 0 });
    const tzOffset = Number.isFinite(tz) ? Math.max(-840, Math.min(840, Number(tz))) : 0;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(today ?? "") ? today! : new Date().toISOString().slice(0, 10);
    const last = live.map((l) => l.a.last_checked_at).filter(Boolean).sort()[0] ?? null;
    const since = last ? Math.ceil((Date.now() - Date.parse(last)) / 86_400_000) + 1 : 30;
    const days = Math.min(30, Math.max(2, since));

    const { data: roles } = await supabase
      .from("applications")
      .select("id,title,company,role,status")
      .in("status", ACTIVE)
      .not("company", "is", null)
      .order("updated_at", { ascending: false })
      .limit(12);

    // The newest email behind an update, so the Applications page can link straight to it in Gmail.
    const mailRef = (msgs: { id: string; date: string; account: string | null }[]) => {
      const newest = [...msgs].sort((a, b) => b.date.localeCompare(a.date))[0];
      return newest ? { id: newest.id, account: newest.account } : null;
    };
    // What changed on which role, for the summary on the Applications page.
    type Change = { id: string; company: string; status: string; next: string; link: string | null; account: string | null };
    const changes: Change[] = [];
    const change = (id: string, company: string | null, status: string, next: string | null | undefined, mail: { id: string; account: string | null } | null) =>
      changes.push({ id, company: company || "New application", status: LABEL[status] ?? status, next: next ?? "", link: gmailLink(mail), account: mail?.account ?? null });
    let emails = 0;
    let updates = 0;
    let applied = 0;
    let limited = false;

    // A few roles at a time keeps the check inside the time limit.
    const list = roles ?? [];
    for (let i = 0; i < list.length; i += 4) {
      await Promise.all(
        list.slice(i, i + 4).map(async (r) => {
          // New emails about this company, from every account being checked.
          const perAccount = await Promise.all(
            live.map(async (l) => {
              const ids = (await searchCompany(l.access, r.company!, days).catch(() => [])).filter((id) => !l.seen.has(id));
              ids.forEach((id) => l.seen.add(id));
              const msgs = await Promise.all(ids.map((id) => readMessage(l.access, id).catch(() => null)));
              return msgs.filter((m): m is NonNullable<typeof m> => !!m).map((m) => ({ ...m, account: l.a.email }));
            }),
          );
          const found = perAccount.flat();
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
            if (!error) {
              applied++;
              change(r.id, r.company, u.status, u.next_step, mailRef(found));
            }
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

    // Other application emails: roles that aren't on the board yet (or are, under a slightly different name).
    let added = 0;
    let needsInfo = 0;
    if (!limited) {
      const fresh: { id: string; date: string; text: string; account: string | null; subject: string }[] = [];
      for (const l of live) {
        const ids = (await searchApplications(l.access, days).catch(() => [])).filter((id) => !l.seen.has(id));
        ids.forEach((id) => l.seen.add(id));
        const msgs = await Promise.all(ids.map((id) => readMessage(l.access, id).catch(() => null)));
        for (const m of msgs) if (m) fresh.push({ ...m, text: m.text.slice(0, 1800), account: l.a.email, subject: /Subject: (.*)/.exec(m.text)?.[1] ?? "" });
      }
      if (fresh.length) {
        emails += fresh.length;
        let ok = true;
        try {
          await consumeRun(supabase, "email");
        } catch {
          ok = false;
          limited = true;
        }
        const found = ok
          ? await generateJson<{ items: FoundApplication[] }>({
              model: MODEL_FAST(),
              system: discoverSystem,
              prompt: discoverPrompt(day, fresh.slice(0, 12).map((m) => m.text)),
              schema: discoverSchema,
            })
              .then((r) => noLongDashes(r.data).items ?? [])
              .catch(() => [])
          : [];
        const { data: board } = await supabase.from("applications").select("id,title,company,role,status").neq("verdict", "binned");
        const norm = (x: string | null | undefined) => (x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const byCompany = new Map((board ?? []).filter((b) => b.company).map((b) => [norm(b.company), b]));
        // Several emails about the same company in one go: handle the newest one.
        const seenCompany = new Set<string>();
        const items = found
          .filter((f) => f.job_related && fresh[f.index])
          .sort((a, b) => fresh[b.index].date.localeCompare(fresh[a.index].date));
        for (const f of items) {
          const m = fresh[f.index];
          const key = norm(f.company) || `subject:${norm(m.subject)}`;
          if (seenCompany.has(key)) continue;
          seenCompany.add(key);
          const ref = { id: m.id, account: m.account };
          const status = f.status === "none" ? "submitted" : f.status;
          const known = f.company ? byCompany.get(norm(f.company)) : undefined;
          if (known) {
            // Already on the board: same rule as above, only clear progress is applied.
            if (!(TERMINAL.includes(status) || rank(status) > rank(known.status))) continue;
            const patch = updatePatch(status, f, tzOffset);
            const { error } = await supabase.from("applications").update(patch).eq("id", known.id);
            updates++;
            if (!error) {
              applied++;
              change(known.id, known.company, status, (patch as { next_step?: string }).next_step, ref);
            }
            await notify(supabase, {
              key: `email:${known.id}:${m.id}`,
              kind: "email",
              title: `${known.company}: moved to ${LABEL[status] ?? status}`,
              body: `From an email. ${f.summary}`,
              href: `/app/a/${known.id}`,
              application_id: known.id,
              data: { applied: !error, from: known.status, suggestion: { status, summary: f.summary }, mail: ref },
            });
            continue;
          }
          // Not on the board yet: add it to Applications at that stage; ask for anything the email didn't say.
          const missing = [!f.company && "company", !f.role && "role"].filter(Boolean) as string[];
          const row = {
            title: (f.role && f.company ? `${f.role} at ${f.company}` : f.role || f.company || m.subject || "Application from an email").slice(0, 300),
            company: f.company?.slice(0, 200) || null,
            role: f.role?.slice(0, 300) || null,
            job_url: /^https?:\/\//.test(f.job_url) ? f.job_url.slice(0, 2000) : null,
            submitted_on: m.date.slice(0, 10),
            ...updatePatch(status, f, tzOffset),
          };
          const { data: created, error } = await supabase.from("applications").insert(row).select("id").single();
          if (error || !created) continue;
          added++;
          if (missing.length) needsInfo++;
          change(created.id, row.company, status, (row as { next_step?: string }).next_step, ref);
          await notify(supabase, {
            key: `email:new:${m.id}`,
            kind: "email",
            title: missing.length
              ? `New application from an email: add the ${missing.join(" and ")}`
              : `Added to Applications: ${f.company} · ${f.role}`,
            body: missing.length
              ? `${f.summary} The email didn't say the ${missing.join(" or ")}. Open it and fill in what's missing.`
              : `From an email. ${f.summary}`,
            href: `/app/a/${created.id}`,
            application_id: created.id,
            data: { applied: true, from: null, suggestion: { status, summary: f.summary }, mail: ref, missing },
          });
        }
      }
    }

    for (const l of live) {
      await forAccount(
        supabase.from("gmail_connections").update({ last_checked_at: new Date().toISOString(), seen: [...l.seen].slice(-500) }),
        l.a,
      );
    }
    return Response.json({ state: "done", roles: list.length, emails, updates, applied, added, needsInfo, limited, accounts: live.length, expired, changes });
  } catch (e) {
    return errorResponse(e);
  }
}
