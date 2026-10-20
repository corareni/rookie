import type { Metadata } from "next";
import PrintShell from "@/components/PrintShell";
import type { CvContent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "CV · Rookie" };

const heading: React.CSSProperties = {
  fontSize: "10.5pt",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderBottom: "0.6pt solid #000",
  marginTop: "9pt",
  paddingBottom: "1pt",
};

export default async function CvPrint({ params }: PageProps<"/app/a/[id]/print/cv">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("content").eq("application_id", id).eq("kind", "cv").maybeSingle();
  if (!doc) return <p className="pt-6">No CV yet. Generate one on the role page first.</p>;
  const cv = doc.content as CvContent;

  return (
    <PrintShell>
      <div style={{ fontSize: "9.8pt", lineHeight: "12.2pt" }}>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: "17pt", letterSpacing: "0.04em", lineHeight: 1.2 }}>
          {cv.name.toUpperCase()}
        </p>
        <p style={{ textAlign: "center", fontSize: "9.3pt", marginTop: "2pt" }}>{cv.contact.join(" | ")}</p>

        <p style={heading}>Summary</p>
        <p style={{ marginTop: "3pt", textAlign: "justify" }}>{cv.summary}</p>

        {cv.sections.map((s) => (
          <section key={s.heading}>
            <p style={heading}>{s.heading}</p>
            {s.items.map((it, i) => (
              <div key={i} style={{ marginTop: "4pt", breakInside: "avoid" }}>
                <p style={{ display: "flex", justifyContent: "space-between", gap: "8pt" }}>
                  <span>
                    <b>{it.title}</b>
                    {it.subtitle && <i> | {it.subtitle}</i>}
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>{it.dates}</span>
                </p>
                {it.bullets.filter((b) => b.trim()).length > 0 && (
                  <ul style={{ margin: "1pt 0 0 12pt", listStyle: "disc" }}>
                    {it.bullets
                      .filter((b) => b.trim())
                      .map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}

        {cv.skills.length > 0 && (
          <section>
            <p style={heading}>Skills and languages</p>
            {cv.skills.map((s) => (
              <p key={s.group} style={{ marginTop: "2pt" }}>
                <b>{s.group}:</b> {s.items}
              </p>
            ))}
          </section>
        )}
      </div>
    </PrintShell>
  );
}
