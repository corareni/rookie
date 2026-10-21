import { createClient } from "@/lib/supabase/server";
import { errorResponse, getUser } from "@/server/ai/limits";
import { gmailConfigured, refreshAccess, revoke } from "@/server/gmail";

/** Whether Gmail can be connected here, and whether this user has. */
export async function GET() {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { data, error } = await supabase.from("gmail_connections").select("email,last_checked_at").maybeSingle();
    return Response.json({
      configured: gmailConfigured() && !error,
      connected: !!data,
      email: data?.email ?? null,
      lastChecked: data?.last_checked_at ?? null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Disconnect: revoke rookie's access at Google and forget the key. */
export async function DELETE() {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const { data } = await supabase.from("gmail_connections").select("refresh_token").maybeSingle();
    if (data?.refresh_token) {
      const t = await refreshAccess(data.refresh_token);
      await revoke(t.access_token ?? data.refresh_token);
    }
    await supabase.from("gmail_connections").delete().not("user_id", "is", null);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
