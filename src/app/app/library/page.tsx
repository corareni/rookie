import type { Metadata } from "next";
import LibraryView, { type CurrentDoc, type LibraryFile } from "@/components/LibraryView";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Library · rookie" };

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: docs }, { data: apps }, files] = await Promise.all([
    supabase.from("documents").select("application_id,kind,updated_at").order("updated_at", { ascending: false }),
    supabase.from("applications").select("id,company,role,title,status"),
    supabase.from("library_files").select("id,name,path,kind,size,created_at").order("created_at", { ascending: false }),
  ]);

  // Group the current CV and letter per application.
  const byApp = new Map<string, CurrentDoc>();
  for (const d of docs ?? []) {
    const a = apps?.find((x) => x.id === d.application_id);
    if (!a) continue;
    const cur = byApp.get(a.id) ?? {
      id: a.id,
      label: [a.company ?? a.title, a.role].filter(Boolean).join(" · "),
      status: a.status,
      updated: d.updated_at,
      kinds: [] as CurrentDoc["kinds"],
    };
    cur.kinds.push(d.kind as "cv" | "cover_letter");
    byApp.set(a.id, cur);
  }

  return (
    <LibraryView
      userId={user!.id}
      current={[...byApp.values()]}
      files={(files.data ?? []) as LibraryFile[]}
      ready={!files.error}
    />
  );
}
