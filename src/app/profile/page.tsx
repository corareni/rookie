import type { Metadata } from "next";
import DeleteAccount from "@/components/DeleteAccount";
import FileShelf, { type LibraryFile } from "@/components/FileShelf";
import ProfileForm from "@/components/ProfileForm";
import { PROFILE_COLUMNS, toProfileData } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import Arrow from "@/components/Arrow";
import TourAgain from "@/components/TourAgain";

export const metadata: Metadata = { title: "Profile · rookie" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
    docs,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle(),
    supabase.from("library_files").select("id,name,path,kind,size,created_at").eq("kind", "other").order("created_at", { ascending: false }),
  ]);

  return (
    <main>
      <section className="hero mb-[var(--gap)] flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="chip-tag">Profile</span>
          <h1 className="display mt-5">
            About you. <em>Once, then every application.</em>
          </h1>
          <p className="mt-4 max-w-[600px] text-[16px] text-[var(--ink2)]">
            rookie scores roles for you, flags the ones that clash with your barriers, and writes your CV and cover letters,
            all from what you add here.
            <b className="mt-2 block break-anywhere text-[var(--ink)]">Signed in as {user?.email}</b>
          </p>
        </div>
        <span className="flex items-center gap-3">
          <TourAgain />
          <a href="#upload-h" className="arrow-btn" aria-label="Jump to CV upload">
            <Arrow size="40%" />
          </a>
        </span>
      </section>

      <ProfileForm initial={toProfileData(profile, user?.email)} />

      <section className="mt-[var(--gap)]" aria-labelledby="docs-h">
        <h2 id="docs-h" className="sr-only">
          Transcripts and other documents
        </h2>
        <FileShelf
          userId={user!.id}
          initial={(docs.data ?? []) as LibraryFile[]}
          ready={!docs.error}
          kinds={[{ v: "other", label: "Transcript or other document" }]}
          tone="tile-sky"
          title={
            <>
              <b>Upload transcripts</b> <span className="font-light">and other documents.</span>
            </>
          }
          hint="University or school transcripts, certificates, references: anything that backs up your application. rookie reads them once and can use facts like grades or modules in your CV and letters. PDF or Word, up to 10 MB, private to you."
          successText="Saved. rookie can now use facts from this document."
        />
      </section>

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
