import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consentUrl, gmailConfigured } from "@/server/gmail";

/** Starts "Connect Gmail": sends the user to Google's consent screen for read-only access. */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  if (!gmailConfigured()) return NextResponse.redirect(`${origin}/app/applications?gmail=unavailable`);

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(consentUrl(origin, state));
  // Checked on the way back, so nobody else can attach their inbox to this account.
  res.cookies.set("gmail_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/gmail" });
  return res;
}
