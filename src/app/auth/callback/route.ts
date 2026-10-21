import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google sends people back here with a one-time code; swap it for a session, then open the board. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const from = searchParams.get("from") === "signup" ? "/signup" : "/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/app`);
  }
  // Cancelled, expired or misconfigured: back to the form with a short note.
  return NextResponse.redirect(`${origin}${from}?error=google`);
}
