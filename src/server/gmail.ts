import "server-only";

/** Read-only Gmail access: rookie can search and read emails, never send, change or delete them. */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const gmailConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const redirectUri = (origin: string) => `${origin}/api/gmail/callback`;

export function consentUrl(origin: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: `openid email ${GMAIL_SCOPE}`,
    access_type: "offline",
    // Always ask which account, so a second Gmail can be added.
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; id_token?: string; error?: string };
  return { ok: res.ok, ...data };
}

export const exchangeCode = (code: string, origin: string) =>
  token({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });

export const refreshAccess = (refresh: string) => token({ refresh_token: refresh, grant_type: "refresh_token" });

export async function revoke(tokenValue: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenValue)}`, { method: "POST" }).catch(() => {});
}

async function gmail<T>(access: string, path: string): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}`);
  return res.json() as Promise<T>;
}

export const gmailAddress = (access: string) => gmail<{ emailAddress: string }>(access, "profile").then((p) => p.emailAddress);

/** Ids of recent emails mentioning a company, newest first, excluding ones the user sent. */
export async function searchCompany(access: string, company: string, days: number, max = 3) {
  const q = `"${company.replace(/"/g, "")}" newer_than:${days}d -from:me -in:chats`;
  const r = await gmail<{ messages?: { id: string }[] }>(access, `messages?maxResults=${max}&q=${encodeURIComponent(q)}`);
  return (r.messages ?? []).map((m) => m.id);
}

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
type Message = { id: string; internalDate: string; snippet: string; payload: Part & { headers?: { name: string; value: string }[] } };

const decode = (b64: string) => Buffer.from(b64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
const stripHtml = (html: string) =>
  html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n");

function bodyText(p: Part): string {
  if (p.mimeType === "text/plain" && p.body?.data) return decode(p.body.data);
  for (const c of p.parts ?? []) {
    const t = bodyText(c);
    if (t) return t;
  }
  if (p.mimeType === "text/html" && p.body?.data) return stripHtml(decode(p.body.data));
  return "";
}

/** One email as plain text with its sender, subject and date, capped in length. */
export async function readMessage(access: string, id: string) {
  const m = await gmail<Message>(access, `messages/${id}?format=full`);
  const h = (n: string) => m.payload.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
  const text = (bodyText(m.payload) || m.snippet).trim().slice(0, 3000);
  return {
    id: m.id,
    date: new Date(Number(m.internalDate)).toISOString(),
    text: `From: ${h("from")}\nSubject: ${h("subject")}\nDate: ${h("date")}\n\n${text}`,
  };
}

export type GmailAccount = {
  /** Row id (phase 7); before that there's one account per user and this is null. */
  id: string | null;
  email: string | null;
  refresh_token: string;
  last_checked_at: string | null;
  seen: string[];
};

/**
 * The user's connected Gmail accounts. Works before and after the phase 7 database update
 * (which allows several accounts per user).
 */
export async function listAccounts(supabase: import("@supabase/supabase-js").SupabaseClient) {
  const multi = await supabase.from("gmail_connections").select("id,email,refresh_token,last_checked_at,seen").order("created_at");
  if (!multi.error) return { accounts: (multi.data ?? []) as GmailAccount[], multi: true, error: null };
  const one = await supabase.from("gmail_connections").select("email,refresh_token,last_checked_at,seen");
  return { accounts: ((one.data ?? []) as Omit<GmailAccount, "id">[]).map((a) => ({ ...a, id: null })), multi: false, error: one.error };
}

/** Narrows a query to one account (by id after phase 7, else the user's only row). */
export const forAccount = <T extends { eq: (c: string, v: string) => T; not: (c: string, o: string, v: null) => T }>(q: T, a: GmailAccount) =>
  a.id ? q.eq("id", a.id) : q.not("user_id", "is", null);

/** Recent emails that look like part of an application process, whichever company they're from. */
export async function searchApplications(access: string, days: number, max = 12) {
  const words = '(application OR applied OR applying OR interview OR assessment OR "online test" OR "next steps" OR offer OR internship OR "working student" OR graduate OR "thank you for your interest")';
  const q = `newer_than:${days}d -from:me -in:chats -category:promotions -category:social subject:${words}`;
  const r = await gmail<{ messages?: { id: string }[] }>(access, `messages?maxResults=${max}&q=${encodeURIComponent(q)}`);
  return (r.messages ?? []).map((m) => m.id);
}
