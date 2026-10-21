import { createClient } from "@/lib/supabase/server";
import { errorResponse, getUser } from "@/server/ai/limits";
import { forAccount, gmailConfigured, listAccounts, refreshAccess, revoke } from "@/server/gmail";

/** Whether Gmail can be connected here, and the user's connected accounts. */
export async function GET() {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { accounts, multi, error } = await listAccounts(supabase);
    return Response.json({
      configured: gmailConfigured() && !error,
      // Adding a second account needs the phase 7 database update.
      multiple: multi,
      accounts: accounts.map((a) => ({ id: a.id ?? "only", email: a.email, lastChecked: a.last_checked_at })),
      // Kept for older screens.
      connected: accounts.length > 0,
      email: accounts[0]?.email ?? null,
      lastChecked: accounts[0]?.last_checked_at ?? null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Disconnect one account (?id=…) or all: revoke rookie's access at Google and forget the key. */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const id = new URL(request.url).searchParams.get("id");
    const { accounts } = await listAccounts(supabase);
    for (const a of accounts.filter((x) => !id || id === "only" || x.id === id)) {
      const t = await refreshAccess(a.refresh_token);
      await revoke(t.access_token ?? a.refresh_token);
      await forAccount(supabase.from("gmail_connections").delete(), a);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
