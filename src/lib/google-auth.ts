import "server-only";

/** Whether Google sign-in is switched on in Supabase (checked at most once a minute). */
export async function googleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      next: { revalidate: 60 },
    });
    const d = await res.json();
    return d?.external?.google === true;
  } catch {
    return false;
  }
}
