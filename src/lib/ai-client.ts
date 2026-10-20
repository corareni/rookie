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

export const generateDocs = (id: string) => post<{ ok: true }>("/api/generate", { id });
