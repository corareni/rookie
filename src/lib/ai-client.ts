import type { Contact, StructuredProfile } from "@/lib/profile";
import type { Application } from "@/lib/applications";

/** Calls Rookie's own server routes; the AI key never reaches the browser. */
async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data as T;
}

export const analyzeRole = (id: string, text?: string) =>
  post<{ application: Application }>("/api/analyze", { id, text }).then((d) => d.application);

export const compareRoles = (ids: string[]) => post<{ id: string }>("/api/compare", { ids }).then((d) => d.id);

export type GenerateOptions = { style: "concise" | "story" | "elaborate"; length: "short" | "standard" | "long"; facts: string[] };

export const generateDocs = (id: string, options?: GenerateOptions) => post<{ ok: true }>("/api/generate", { id, ...options });

export async function importCv(file: File) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/profile/import", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Couldn't read your CV. Try again.");
  return data as { contact: Contact; cv_text: string; profile: StructuredProfile };
}
