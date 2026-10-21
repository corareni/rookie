/**
 * Languages rookie writes CVs and cover letters in. Only languages the PDF font can show (Latin script).
 * `summary` and `re` are the fixed words on the documents, `locale` formats the letter's date.
 */
export const LANGUAGES = [
  { v: "en", label: "English", locale: "en-GB", summary: "Summary", re: "Re" },
  { v: "es", label: "Spanish", locale: "es-ES", summary: "Perfil", re: "Asunto" },
  { v: "fr", label: "French", locale: "fr-FR", summary: "Profil", re: "Objet" },
  { v: "de", label: "German", locale: "de-DE", summary: "Profil", re: "Betreff" },
  { v: "it", label: "Italian", locale: "it-IT", summary: "Profilo", re: "Oggetto" },
  { v: "pt", label: "Portuguese", locale: "pt-PT", summary: "Perfil", re: "Assunto" },
  { v: "nl", label: "Dutch", locale: "nl-NL", summary: "Profiel", re: "Betreft" },
  { v: "sv", label: "Swedish", locale: "sv-SE", summary: "Profil", re: "Angående" },
] as const;

export type Language = (typeof LANGUAGES)[number]["v"];

/** The language's details; English when unknown (and for documents written before languages existed). */
export const language = (v?: string | null) => LANGUAGES.find((l) => l.v === v) ?? LANGUAGES[0];

export type CvEntry = {
  org: string;
  org_note: string;
  location: string;
  role: string;
  role_note: string;
  dates: string;
  bullets: string[];
};

export type CvSection = {
  heading: string;
  kind: "entries" | "lines";
  entries: CvEntry[];
  lines: { label: string; text: string }[];
};

/** A classic one-page CV: centred header, ruled section headings, entries or "Label: text" lines. */
export type CvContent = {
  header: { name: string; contact: string[]; note: string };
  summary: string;
  sections: CvSection[];
  /** The language it's written in (see LANGUAGES); missing means English. */
  lang?: string;
};

export type LetterContent = {
  addressee: string[];
  re: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
  lang?: string;
};

export type Doc<T> = { content: T; meta: Record<string, string[]>; edited: boolean } | null;

export function cvAsText(cv: CvContent) {
  return [
    cv.header.name.toUpperCase(),
    cv.header.contact.join(" | "),
    cv.header.note,
    "",
    "SUMMARY",
    cv.summary,
    ...cv.sections.flatMap((s) => [
      "",
      s.heading.toUpperCase(),
      ...(s.kind === "entries"
        ? s.entries.flatMap((e) => [
            [e.org + (e.org_note ? ` - ${e.org_note}` : ""), e.location].filter(Boolean).join(" | "),
            [e.role + (e.role_note ? ` (${e.role_note})` : ""), e.dates].filter(Boolean).join(" | "),
            ...e.bullets.filter(Boolean).map((b) => `- ${b}`),
          ])
        : s.lines.map((l) => `- ${l.label}: ${l.text}`)),
    ]),
  ]
    .filter((x, i, a) => x !== "" || a[i - 1] !== "")
    .join("\n");
}

export function letterAsText(l: LetterContent, signature: string) {
  return [l.greeting, "", ...l.paragraphs.flatMap((p) => [p, ""]), l.closing, signature].join("\n");
}
