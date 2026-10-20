import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign up · Rookie" };

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AuthForm mode="signup" signedInAs={user?.email ?? null} />;
}
