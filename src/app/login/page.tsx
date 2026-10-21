import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log in · Rookie" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AuthForm
      mode="login"
      signedInAs={user?.email ?? null}
      google={await googleEnabled()}
      googleError={(await searchParams).error === "google"}
    />;
}
