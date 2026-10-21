export type Status =
  | "interested"
  | "submitted"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type Application = {
  id: string;
  title: string;
  status: Status;
  deadline: string | null;
  submitted_on: string | null;
  assessment_on: string | null;
  interview_on: string | null;
  offer_on: string | null;
  notes: string;
  job_url: string | null;
  company: string | null;
  role: string | null;
  location: string | null;
  created_at: string;
  job_status: "none" | "reading" | "ready" | "failed";
  score: number | null;
  track: string | null;
  what: string | null;
  why: string | null;
  risk: string | null;
  timing: string | null;
  closes_note: string | null;
  verdict: Verdict;
  ai_flag: "deal_breaker" | "concern" | null;
  verdict_reason: string | null;
  next_step: string | null;
};

export type Verdict = "open" | "barrier" | "ruled_out" | "binned";

export const COLUMNS =
  "id,title,status,deadline,submitted_on,assessment_on,interview_on,offer_on,notes,job_url,company,role,location,created_at," +
  "job_status,score,track,what,why,risk,timing,closes_note,verdict,verdict_reason,ai_flag,next_step";

export const TRACKS = ["Consulting", "Tech & product", "Finance & banking", "Marketing & creative", "Operations & strategy", "Other"];

export const APPLIED_STATUSES: Status[] = ["submitted", "assessment", "interview", "offer", "rejected", "withdrawn"];

/** Score chip colour, as on the board: green 6+, amber 4-5, red 3 or less. */
export const scoreTone = (n: number) => (n >= 6 ? "good" : n >= 4 ? "warn" : "bad");

export const initials = (a: { company: string | null; title: string }) =>
  (a.company || a.title).replace(/^https?:\/\/(www\.)?/, "").trim().charAt(0).toUpperCase() || "?";

export const STATUSES: { value: Status; label: string }[] = [
  { value: "interested", label: "Interested" },
  { value: "submitted", label: "Submitted" },
  { value: "assessment", label: "Assessment" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const OPEN_STATUSES: Status[] = ["interested", "submitted", "assessment", "interview", "offer"];
export const CLOSED_STATUSES: Status[] = ["rejected", "withdrawn"];

export const statusLabel = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;

export const isUrl = (text: string) => {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/** Whole days from today to an ISO date (negative = past). */
export function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function deadlineText(iso: string) {
  const n = daysUntil(iso);
  if (n < 0) return n === -1 ? "overdue by 1 day" : `overdue by ${-n} days`;
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  return `due in ${n} days`;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function isoInDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with", "via", "de", "y"]);

/** "software engineer, summer intern" -> "Software Engineer, Summer Intern" (acronyms like "UK" or "AI" stay). */
export function titleCase(s: string | null | undefined) {
  if (!s) return "";
  let first = true;
  return s.replace(/[\p{L}\p{N}][\p{L}\p{N}'’&.]*/gu, (w) => {
    const out =
      w.length > 1 && w === w.toUpperCase()
        ? w
        : !first && SMALL.has(w.toLowerCase())
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1);
    first = false;
    return out;
  });
}
