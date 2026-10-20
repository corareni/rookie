// The structured profile a user builds once; every analysis, CV and letter is written from it.

export type Entry = { org: string; role: string; location: string; start: string; end: string; bullets: string[] };
export type Project = { name: string; description: string; link: string };
export type Link = { label: string; url: string };

export type StructuredProfile = {
  experience: Entry[];
  education: Entry[];
  volunteering: Entry[];
  projects: Project[];
  skills: string[];
  languages: string[];
  hobbies: string[];
  interests: string[];
  fun_facts: string[];
  links: Link[];
  outside_work: string;
};

export type BarrierRule = { text: string; kind: "deal_breaker" | "concern" };

export type Contact = { name?: string; email?: string; phone?: string; city?: string; linkedin?: string };

export type ProfileData = {
  cv_text: string;
  profile: StructuredProfile;
  story_points: string[];
  memory: string;
  barriers: BarrierRule[];
  writing_notes: string;
  contact: Contact;
};

export const PROFILE_COLUMNS = "cv_text,profile,story_points,memory,barriers,writing_notes,contact,story,rules";

export const emptyEntry = (): Entry => ({ org: "", role: "", location: "", start: "", end: "", bullets: [] });

export const emptyProfile = (): StructuredProfile => ({
  experience: [],
  education: [],
  volunteering: [],
  projects: [],
  skills: [],
  languages: [],
  hobbies: [],
  interests: [],
  fun_facts: [],
  links: [],
  outside_work: "",
});

type Row = Partial<ProfileData> & { story?: string | null; rules?: string | null };

/** Normalises a profiles row, carrying over the older single-text story and rules fields. */
export function toProfileData(row: Row | null, email?: string): ProfileData {
  const p = { ...emptyProfile(), ...((row?.profile as Partial<StructuredProfile> | undefined) ?? {}) };
  const story = Array.isArray(row?.story_points) ? row!.story_points : [];
  const barriers = Array.isArray(row?.barriers) ? row!.barriers : [];
  return {
    cv_text: row?.cv_text ?? "",
    profile: p,
    story_points: story.length || !row?.story?.trim() ? story : [row.story.trim()],
    memory: row?.memory ?? "",
    barriers:
      barriers.length || !row?.rules?.trim()
        ? barriers
        : row.rules
            .split(/\n|(?<=\.)\s+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text) => ({ text, kind: "concern" as const })),
    writing_notes: row?.writing_notes ?? "",
    contact: { email, ...((row?.contact as Contact | undefined) ?? {}) },
  };
}

/** True when there's enough about the user to write a CV from. */
export function hasProfileContent(d: ProfileData) {
  const p = d.profile;
  return !!(d.cv_text.trim() || p.experience.length || p.education.length || p.projects.length);
}

/** Plain-text version of the profile for the AI (and for "Copy"). */
export function profileAsText(d: ProfileData) {
  const p = d.profile;
  const entries = (title: string, list: Entry[]) =>
    list.length
      ? [
          title.toUpperCase(),
          ...list.flatMap((e) => [
            [e.org, e.role, e.location, [e.start, e.end].filter(Boolean).join(" - ")].filter(Boolean).join(" | "),
            ...e.bullets.filter(Boolean).map((b) => `- ${b}`),
          ]),
          "",
        ]
      : [];
  const list = (title: string, items: string[]) => (items.length ? [`${title}: ${items.join(", ")}`] : []);
  return [
    ...entries("Experience", p.experience),
    ...entries("Education", p.education),
    ...entries("Volunteering", p.volunteering),
    ...(p.projects.length
      ? ["PROJECTS", ...p.projects.map((x) => `- ${x.name}: ${x.description}${x.link ? ` (${x.link})` : ""}`), ""]
      : []),
    ...list("Skills", p.skills),
    ...list("Languages", p.languages),
    ...list("Hobbies", p.hobbies),
    ...list("Interests", p.interests),
    ...list("Fun facts", p.fun_facts),
    ...(p.links.length ? [`Links: ${p.links.map((l) => `${l.label} ${l.url}`).join(", ")}`] : []),
    ...(p.outside_work.trim() ? [`Outside work: ${p.outside_work.trim()}`] : []),
  ]
    .join("\n")
    .trim();
}
