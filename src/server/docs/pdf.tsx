import "server-only";
import { Document, Font, Page, Text, View, renderToBuffer, StyleSheet } from "@react-pdf/renderer";

// CVs never hyphenate words across lines.
Font.registerHyphenationCallback((word) => [word]);
import type { CvContent, LetterContent } from "@/lib/documents";

// The built-in PDF Times font only covers Western European characters; swap anything else.
const safe = (s: string) =>
  (s ?? "")
    .replace(/[‐-―]/g, "-")
    .replace(/[●▪■∙]/g, "•")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF€•‘’“”…ŒœŠšŸŽž]/g, "");

const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

function cvStyles(scale: number) {
  const f = 10 * scale;
  return StyleSheet.create({
    page: { fontFamily: "Times-Roman", fontSize: f, lineHeight: 1.18, paddingTop: 30, paddingBottom: 26, paddingHorizontal: 42 },
    name: { fontFamily: "Times-Bold", fontSize: 14.5 * scale, textAlign: "center" },
    contact: { textAlign: "center", marginTop: 4 },
    note: { fontFamily: "Times-Italic", textAlign: "center" },
    heading: {
      fontFamily: "Times-Bold",
      fontSize: 11 * scale,
      textTransform: "uppercase",
      borderBottomWidth: 0.8,
      borderBottomColor: "#000",
      paddingBottom: 1,
      marginTop: 8 * scale,
      marginBottom: 2.5 * scale,
    },
    summary: { textAlign: "justify" },
    entry: { marginTop: 2.5 * scale },
    row: { flexDirection: "row", justifyContent: "space-between" },
    bold: { fontFamily: "Times-Bold" },
    italic: { fontFamily: "Times-Italic" },
    boldItalic: { fontFamily: "Times-BoldItalic" },
    bullet: { flexDirection: "row", marginLeft: 8, marginTop: 0.6 },
    dot: { width: 9 },
    bulletText: { flex: 1 },
  });
}

function CvDoc({ cv, scale }: { cv: CvContent; scale: number }) {
  const s = cvStyles(scale);
  return (
    <Document title={`${safe(cv.header.name)} - CV`} author={safe(cv.header.name)}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{safe(cv.header.name).toUpperCase()}</Text>
        <Text style={s.contact}>{safe(cv.header.contact.join(" | "))}</Text>
        {cv.header.note ? <Text style={s.note}>{safe(cv.header.note)}</Text> : null}

        <Text style={s.heading}>Summary</Text>
        <Text style={s.summary}>{safe(cv.summary)}</Text>

        {cv.sections.map((sec, i) => (
          <View key={i}>
            <Text style={s.heading}>{safe(sec.heading)}</Text>
            {sec.kind === "entries"
              ? sec.entries.map((e, j) => (
                  <View key={j} style={s.entry} wrap={false}>
                    <View style={s.row}>
                      <Text>
                        <Text style={s.bold}>{safe(e.org).toUpperCase()}</Text>
                        {e.org_note ? <Text style={s.boldItalic}>{` - ${safe(e.org_note)}`}</Text> : null}
                      </Text>
                      <Text style={s.bold}>{safe(e.location)}</Text>
                    </View>
                    <View style={s.row}>
                      <Text>
                        <Text style={s.bold}>{safe(e.role)}</Text>
                        {e.role_note ? <Text style={s.italic}>{` (${safe(e.role_note)})`}</Text> : null}
                      </Text>
                      <Text style={s.bold}>{safe(e.dates)}</Text>
                    </View>
                    {e.bullets
                      .filter((b) => b.trim())
                      .map((b, k) => (
                        <View key={k} style={s.bullet}>
                          <Text style={s.dot}>•</Text>
                          <Text style={s.bulletText}>{safe(b)}</Text>
                        </View>
                      ))}
                  </View>
                ))
              : sec.lines.map((l, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.bulletText}>
                      <Text style={s.bold}>{safe(l.label)}:</Text> {safe(l.text)}
                    </Text>
                  </View>
                ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

/** Drops the last bullet of the entry with the most bullets (keeps at least one per entry). */
function trimOnce(cv: CvContent): CvContent | null {
  const next: CvContent = structuredClone(cv);
  let best: { b: string[] } | null = null;
  for (const sec of next.sections)
    for (const e of sec.entries) if (e.bullets.length > 1 && (!best || e.bullets.length > best.b.length)) best = { b: e.bullets };
  if (best) {
    best.b.pop();
    return next;
  }
  const lines = next.sections.filter((s) => s.kind === "lines" && s.lines.length > 1).sort((a, b) => b.lines.length - a.lines.length)[0];
  if (lines) {
    lines.lines.pop();
    return next;
  }
  return null;
}

/** Renders the CV and guarantees one A4 page: tighter type first, then trims the longest entries. */
export async function cvPdf(cv: CvContent): Promise<Buffer> {
  let content = cv;
  for (let round = 0; round < 12; round++) {
    for (const scale of [1, 0.95, 0.91, 0.87, 0.84]) {
      const pdf = await renderToBuffer(<CvDoc cv={content} scale={scale} />);
      if (pageCount(pdf) <= 1) return pdf;
    }
    const trimmed = trimOnce(content);
    if (!trimmed) break;
    content = trimmed;
  }
  return renderToBuffer(<CvDoc cv={content} scale={0.84} />);
}

const ls = StyleSheet.create({
  page: { fontFamily: "Times-Roman", fontSize: 10.6, lineHeight: 1.3, paddingTop: 46, paddingBottom: 40, paddingHorizontal: 57 },
  name: { fontFamily: "Times-Bold", fontSize: 17, textAlign: "center", letterSpacing: 0.6 },
  contact: { fontSize: 9.5, textAlign: "center", marginTop: 3 },
  rule: { borderBottomWidth: 0.6, borderBottomColor: "#000", marginTop: 6, marginBottom: 14 },
  gap: { marginTop: 10 },
  re: { fontFamily: "Times-Bold", marginTop: 10 },
  para: { marginTop: 7, textAlign: "justify" },
});

export async function letterPdf(l: LetterContent, contact: { name?: string; line: string }): Promise<Buffer> {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  for (const size of [10.6, 10.2, 9.8]) {
    const pdf = await renderToBuffer(
      <Document title={`${safe(contact.name ?? "")} - Cover letter`}>
        <Page size="A4" style={{ ...ls.page, fontSize: size }}>
          <Text style={ls.name}>{safe(contact.name ?? "").toUpperCase()}</Text>
          <Text style={ls.contact}>{safe(contact.line)}</Text>
          <View style={ls.rule} />
          <Text>{date}</Text>
          <View style={ls.gap}>
            {l.addressee.map((a, i) => (
              <Text key={i}>{safe(a)}</Text>
            ))}
          </View>
          <Text style={ls.re}>Re: {safe(l.re)}</Text>
          <Text style={ls.gap}>{safe(l.greeting)}</Text>
          {l.paragraphs.map((p, i) => (
            <Text key={i} style={ls.para}>
              {safe(p)}
            </Text>
          ))}
          <Text style={ls.gap}>{safe(l.closing)}</Text>
          <Text>{safe(contact.name ?? "")}</Text>
        </Page>
      </Document>,
    );
    if (pageCount(pdf) <= 1 || size === 9.8) return pdf;
  }
  throw new Error("unreachable");
}
