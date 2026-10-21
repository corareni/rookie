import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, gmailAddress } from "@/server/gmail";

/** Google sends the user back here after "Connect Gmail"; keep the read-only key for later checks. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const back = (q: string) => {
    const res = NextResponse.redirect(`${origin}/app/applications?gmail=${q}`);
    res.cookies.delete({ name: "gmail_state", path: "/api/gmail" });
    return res;
  };
  const code = searchParams.get("code");
  if (!code || !searchParams.get("state") || searchParams.get("state") !== request.cookies.get("gmail_state")?.value) {
    return back(searchParams.get("error") === "access_denied" ? "cancelled" : "failed");
  }
  if (!(searchParams.get("scope") ?? "").includes("gmail.readonly")) return back("noscope");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const t = await exchangeCode(code, origin);
  if (!t.ok || !t.access_token || !t.refresh_token) return back("failed");
  const email = await gmailAddress(t.access_token).catch(() => null);
  const { error } = await supabase
    .from("gmail_connections")
    .upsert({ user_id: user.id, email, refresh_token: t.refresh_token, last_checked_at: null }, { onConflict: "user_id" });
  return back(error ? "failed" : "connected");
}
