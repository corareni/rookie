import "server-only";

/** Read-only Gmail access: Rookie can search and read emails, never send, change or delete them. */
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
    prompt: "consent",
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
