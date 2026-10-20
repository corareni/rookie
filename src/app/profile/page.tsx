import type { Metadata } from "next";
import DeleteAccount from "@/components/DeleteAccount";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile · Rookie" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-[680px] pt-4">
      <p className="cap">Profile</p>
      <h1 className="mt-2 text-[36px] font-semibold leading-tight tracking-tight">Your account</h1>

      <section className="card mt-6">
        <p className="label">Email</p>
        <p className="break-anywhere">{user?.email}</p>
      </section>

      <section className="card mt-4">
        <h2 className="text-lg font-semibold">Delete my account and data</h2>
        <p className="mt-1 text-[var(--ink2)]">
          This removes your account and every application on your board straight away. It can&apos;t be undone.
        </p>
        <DeleteAccount />
      </section>
    </main>
  );
}
