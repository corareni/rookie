import type { Metadata } from "next";
import PrintShell from "@/components/PrintShell";
import type { LetterContent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cover letter · Rookie" };

type Contact = { name?: string; email?: string; phone?: string; city?: string; linkedin?: string };

export default async function LetterPrint({ params }: PageProps<"/app/a/[id]/print/letter">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: doc }, { data: profile }] = await Promise.all([
    supabase.from("documents").select("content").eq("application_id", id).eq("kind", "cover_letter").maybeSingle(),
    supabase.from("profiles").select("contact").maybeSingle(),
  ]);
  if (!doc) return <p className="pt-6">No cover letter yet. Generate one on the role page first.</p>;
  const l = doc.content as LetterContent;
  const c = (profile?.contact ?? {}) as Contact;
  const contactLine = [c.city, c.phone, c.email, c.linkedin].filter(Boolean).join(" | ");
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <PrintShell>
      <div style={{ fontSize: "10.6pt", lineHeight: "13.6pt" }}>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: "17pt", letterSpacing: "0.04em", lineHeight: 1.2 }}>
          {(c.name ?? "").toUpperCase()}
        </p>
        <p style={{ textAlign: "center", fontSize: "9.5pt", marginTop: "3pt" }}>{contactLine}</p>
        <hr style={{ border: 0, borderTop: "0.6pt solid #000", margin: "6pt 0 14pt" }} />
        <p>{date}</p>
        <div style={{ marginTop: "10pt" }}>
          {l.addressee.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p style={{ marginTop: "10pt", fontWeight: 700 }}>Re: {l.re}</p>
        <p style={{ marginTop: "10pt" }}>{l.greeting}</p>
        {l.paragraphs.map((p, i) => (
          <p key={i} style={{ marginTop: "7pt", textAlign: "justify" }}>
            {p}
          </p>
        ))}
        <p style={{ marginTop: "10pt" }}>{l.closing}</p>
        <p>{c.name}</p>
      </div>
    </PrintShell>
  );
}
