import type { Metadata } from "next";
import DeleteAccount from "@/components/DeleteAccount";
import ProfileForm from "@/components/ProfileForm";
import { PROFILE_COLUMNS, toProfileData } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile · Rookie" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([supabase.auth.getUser(), supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle()]);

  return (
    <main>
      <section className="hero mb-[var(--gap)] flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="chip-tag">Profile</span>
          <h1 className="display mt-5">
            About you. <em>Once, then every application.</em>
          </h1>
          <p className="mt-4 max-w-[600px] text-[16px] text-[var(--ink2)]">
            Rookie scores roles for you, flags the ones that clash with your barriers, and writes your CV and cover letters,
            all from what you add here. Signed in as <span className="break-anywhere">{user?.email}</span>.
          </p>
        </div>
        <a href="#upload-h" className="arrow-btn" aria-label="Jump to CV upload">
          ↗
        </a>
      </section>

      <ProfileForm initial={toProfileData(profile, user?.email)} />

      <section className="tile mt-[var(--gap)]" aria-labelledby="delete-h">
        <h2 id="delete-h" className="text-[18px]">
          Delete my account and data
        </h2>
        <p className="mt-1 text-[14px] text-[var(--ink2)]">
          Removes your account, profile, every role, document and comparison straight away. It can&apos;t be undone.
        </p>
        <DeleteAccount />
      </section>
    </main>
  );
}
