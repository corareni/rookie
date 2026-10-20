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
};

export const COLUMNS =
  "id,title,status,deadline,submitted_on,assessment_on,interview_on,offer_on,notes,job_url,company,role,location,created_at";

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
