export type CvContent = {
  name: string;
  contact: string[];
  summary: string;
  sections: { heading: string; items: { title: string; subtitle: string; dates: string; bullets: string[] }[] }[];
  skills: { group: string; items: string }[];
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
    cv.name,
    cv.contact.join(" | "),
    "",
    "SUMMARY",
    cv.summary,
    ...cv.sections.flatMap((s) => [
      "",
      s.heading.toUpperCase(),
      ...s.items.flatMap((i) => [[i.title, i.subtitle, i.dates].filter(Boolean).join(" | "), ...i.bullets.map((b) => `- ${b}`)]),
    ]),
    "",
    ...cv.skills.map((s) => `${s.group}: ${s.items}`),
  ].join("\n");
}

export function letterAsText(l: LetterContent, signature: string) {
  return [l.greeting, "", ...l.paragraphs.flatMap((p) => [p, ""]), l.closing, signature].join("\n");
}
