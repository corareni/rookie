import LandingA from "@/components/landing/LandingA";
import LandingB from "@/components/landing/LandingB";
import { LANDING } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (LANDING === "A") return <LandingA />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <LandingB signedIn={!!user} />;
}
