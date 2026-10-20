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
};

export type LetterContent = {
  addressee: string[];
  re: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
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
