import type { Metadata } from "next";
import PrintShell from "@/components/PrintShell";
import type { CvContent } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "CV · Rookie" };

// Classic one-page layout: centred name, ruled bold headings, org and role lines with right-aligned
// location and dates, round bullets, "Label: text" lines.
const heading: React.CSSProperties = {
  fontSize: "11pt",
  fontWeight: 700,
  textTransform: "uppercase",
  borderBottom: "0.8pt solid #000",
  marginTop: "9pt",
  paddingBottom: "1pt",
};
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "8pt" };
const bullets: React.CSSProperties = { margin: "1pt 0 0 14pt", listStyle: "disc" };

export default async function CvPrint({ params }: PageProps<"/app/a/[id]/print/cv">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("content").eq("application_id", id).eq("kind", "cv").maybeSingle();
  const cv = doc?.content as CvContent | undefined;
  if (!cv?.header) return <p className="pt-6">No CV yet, or it was made with an older version. Generate it again on the role page.</p>;

  return (
    <PrintShell>
      <div style={{ fontSize: "9.8pt", lineHeight: "12.1pt" }}>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: "15pt", lineHeight: 1.2 }}>{cv.header.name.toUpperCase()}</p>
        <p style={{ textAlign: "center", marginTop: "2pt" }}>{cv.header.contact.join(" | ")}</p>
        {cv.header.note && <p style={{ textAlign: "center", fontStyle: "italic" }}>{cv.header.note}</p>}

        <p style={heading}>Summary</p>
        <p style={{ marginTop: "2pt", textAlign: "justify" }}>{cv.summary}</p>

        {cv.sections.map((s) => (
          <section key={s.heading}>
            <p style={heading}>{s.heading}</p>
            {s.kind === "entries"
              ? s.entries.map((e, i) => (
                  <div key={i} style={{ marginTop: "4pt", breakInside: "avoid" }}>
                    <p style={row}>
                      <span>
                        <b>{e.org.toUpperCase()}</b>
                        {e.org_note && (
                          <b>
                            <i> - {e.org_note}</i>
                          </b>
                        )}
                      </span>
                      <b style={{ whiteSpace: "nowrap" }}>{e.location}</b>
                    </p>
                    <p style={row}>
                      <span>
                        <b>{e.role}</b>
                        {e.role_note && <i> ({e.role_note})</i>}
                      </span>
                      <b style={{ whiteSpace: "nowrap" }}>{e.dates}</b>
                    </p>
                    {e.bullets.some((b) => b.trim()) && (
                      <ul style={bullets}>
                        {e.bullets
                          .filter((b) => b.trim())
                          .map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))
              : s.lines.length > 0 && (
                  <ul style={{ ...bullets, marginTop: "3pt" }}>
                    {s.lines.map((l, i) => (
                      <li key={i}>
                        <b>{l.label}:</b> {l.text}
                      </li>
                    ))}
                  </ul>
                )}
          </section>
        ))}
      </div>
    </PrintShell>
  );
}
