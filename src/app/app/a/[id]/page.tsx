import type { Metadata } from "next";
import Link from "next/link";
import ApplicationEditor from "@/components/ApplicationEditor";
import { COLUMNS, type Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Application · Rookie" };

export default async function ApplicationPage({ params }: PageProps<"/app/a/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select(COLUMNS).eq("id", id).maybeSingle();

  if (!data) {
    return (
      <main className="pt-10">
        <p className="text-lg font-semibold">This application doesn&apos;t exist or isn&apos;t yours.</p>
        <Link href="/app" className="mt-3 inline-block font-semibold">
          Back to your board
        </Link>
      </main>
    );
  }
  return <ApplicationEditor initial={data as Application} />;
}
