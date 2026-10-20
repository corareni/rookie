import type { Metadata } from "next";
import DeleteAccount from "@/components/DeleteAccount";
import ProfileForm, { type ProfileData } from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile · Rookie" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("cv_text,story,rules,writing_notes,contact").maybeSingle(),
  ]);

  const initial: ProfileData = {
    cv_text: profile?.cv_text ?? "",
    story: profile?.story ?? "",
    rules: profile?.rules ?? "",
    writing_notes: profile?.writing_notes ?? "",
    contact: { email: user?.email, ...(profile?.contact ?? {}) },
  };

  return (
    <main className="mx-auto max-w-[760px] pt-4 pb-16">
      <p className="cap">Profile</p>
      <h1 className="mt-2 text-[clamp(32px,6vw,48px)] font-medium leading-none tracking-[-0.04em]">
        About <em>you.</em>
      </h1>
      <p className="mt-3 text-[var(--ink2)]">
        Rookie uses this to score roles for you, sort out the ones that break your rules, and write your CV and cover
        letters. Signed in as <span className="break-anywhere">{user?.email}</span>.
      </p>

      <div className="mt-6">
        <ProfileForm initial={initial} />
      </div>

      <section className="card mt-10">
        <h2 className="text-lg font-semibold">Delete my account and data</h2>
        <p className="mt-1 text-[var(--ink2)]">
          This removes your account, profile, every role, document and comparison straight away. It can&apos;t be undone.
        </p>
        <DeleteAccount />
      </section>
    </main>
  );
}
