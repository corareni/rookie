import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign up · Rookie" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AuthForm mode="signup" signedInAs={user?.email ?? null} googleError={(await searchParams).error === "google"} />;
}
