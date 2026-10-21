import type { CvContent, LetterContent } from "@/lib/documents";
import { PROFILE_COLUMNS, toProfileData } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { cvDocx, letterDocx } from "@/server/docs/docx";
import { cvPdf, letterPdf } from "@/server/docs/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

const FILES = {
  "cv.pdf": { kind: "cv", type: "application/pdf", label: "CV" },
  "cv.docx": { kind: "cv", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "CV" },
  "letter.pdf": { kind: "cover_letter", type: "application/pdf", label: "Cover Letter" },
  "letter.docx": {
    kind: "cover_letter",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Cover Letter",
  },
} as const;

const fileSafe = (s: string) => s.replace(/[^\p{L}\p{N} .&()-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);

/**
 * Downloads a CV or letter as a real PDF or Word file. Reads with the user's session, so RLS applies.
 * `?saved=<id>` downloads a saved snapshot from the library instead of the current version.
 */
export async function GET(request: Request, ctx: { params: Promise<{ appId: string; file: string }> }) {
  const { appId, file } = await ctx.params;
  const spec = FILES[file as keyof typeof FILES];
  if (!spec) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Please log in.", { status: 401 });

  const saved = new URL(request.url).searchParams.get("saved");
  const docQuery = saved
    ? supabase.from("saved_documents").select("content,label").eq("id", saved).maybeSingle()
    : supabase.from("documents").select("content").eq("application_id", appId).eq("kind", spec.kind).maybeSingle();
  const [{ data: doc }, { data: app }, { data: profileRow }] = await Promise.all([
    docQuery,
    supabase.from("applications").select("company,title").eq("id", appId).maybeSingle(),
    supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle(),
  ]);
  if (!doc) return new Response("This document doesn't exist yet. Generate it first.", { status: 404 });

  const profile = toProfileData(profileRow, user.email);
  const c = profile.contact;
  const contact = { name: c.name, line: [c.city, c.phone, c.email, c.linkedin].filter(Boolean).join(" | ") };

  let body: Buffer;
  try {
    if (spec.kind === "cv") {
      const cv = doc.content as CvContent;
      if (!cv?.header) return new Response("This CV was made with an older version. Regenerate it first.", { status: 409 });
      body = file.endsWith(".pdf") ? await cvPdf(cv) : await cvDocx(cv);
    } else {
      const l = doc.content as LetterContent;
      body = file.endsWith(".pdf") ? await letterPdf(l, contact) : await letterDocx(l, contact);
    }
  } catch (e) {
    console.error("document render failed", e);
    return new Response("Couldn't create the file. Try again.", { status: 500 });
  }

  const company = (doc as { label?: string }).label || app?.company || app?.title || "Application";
  const name = fileSafe(`${c.name || "Rookie"} - ${spec.label} - ${company}`) + file.slice(file.indexOf("."));
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": spec.type,
      "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
