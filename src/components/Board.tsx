"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import RoleCard from "@/components/RoleCard";
import { analyzeRole, compareRoles } from "@/lib/ai-client";
import {
  APPLIED_STATUSES,
  COLUMNS,
  TRACKS,
  daysUntil,
  isUrl,
  isoInDays,
  type Application,
} from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

type Sort = "best" | "closing" | "newest";

export default function Board({
  initial,
  loadError,
  hasProfile,
}: {
  initial: Application[];
  loadError: string | null;
  hasProfile: boolean;
}) {
  const router = useRouter();
  // A read that was interrupted (e.g. the page was closed) shows as failed, so it can be retried.
  const [items, setItems] = useState<Application[]>(() =>
    initial.map((a) =>
      a.job_status === "reading" && Date.now() - Date.parse(a.created_at) > 90_000 ? { ...a, job_status: "failed" } : a,
    ),
  );
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(loadError);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("best");
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [hideNudge, setHideNudge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Fields stay disabled until hydration, so nothing typed early gets lost.
  const ready = useHydrated();

  const patch = (id: string, p: Partial<Application>) =>
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)));

  async function runAnalysis(id: string) {
    patch(id, { job_status: "reading" });
    try {
      const updated = await analyzeRole(id);
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (updated.verdict !== "open")
        setNotice(
          `${updated.company ?? "That role"} needs your review in Barriers${updated.ai_flag === "deal_breaker" ? " (breaks a deal-breaker)" : ""}: ${updated.verdict_reason ?? ""}`,
        );
    } catch (e) {
      patch(id, { job_status: "failed" });
      setNotice(e instanceof Error ? e.message : "Couldn't read that page.");
    }
  }

  async function add(title: string, extra: Partial<Application> = {}) {
    const clean = title.trim();
    if (!clean) {
      setError("Type a role or paste a job link first.");
      return false;
    }
    setSaving(true);
    setError(null);
    // Saved straight away; reading the listing happens afterwards and never blocks this.
    const { data, error } = await createClient()
      .from("applications")
      .insert({ title: clean, job_url: isUrl(clean) ? clean : null, ...extra })
      .select(COLUMNS)
      .single();
    setSaving(false);
    if (error) {
      setError(`Couldn't save: ${error.message}`);
      return false;
    }
    const row = data as unknown as Application;
    setItems((prev) => [row, ...prev]);
    if (row.job_url) void runAnalysis(row.id);
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (await add(inputRef.current?.value ?? text)) {
      setText("");
      inputRef.current?.focus();
    }
  }

  async function update(id: string, p: Partial<Application>, done?: string) {
    const before = items;
    patch(id, p);
    const { error } = await createClient().from("applications").update(p).eq("id", id);
    if (error) {
      setItems(before);
      setError(`Couldn't update: ${error.message}`);
    } else if (done) setNotice(done);
  }

  /** Keeps a copy of the CV and letter that were sent, so later regenerations never lose them. */
  async function snapshot(a: Application) {
    const supabase = createClient();
    const { data: docs } = await supabase.from("documents").select("kind,content").eq("application_id", a.id);
    if (!docs?.length) return;
    const label = [a.company ?? a.title, a.role].filter(Boolean).join(" · ");
    await supabase.from("saved_documents").insert(docs.map((d) => ({ application_id: a.id, label, kind: d.kind, content: d.content })));
  }

  async function remove(id: string) {
    const { error } = await createClient().from("applications").delete().eq("id", id);
    if (error) return setError(`Couldn't remove: ${error.message}`);
    setItems((prev) => prev.filter((a) => a.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
  }

  async function compare() {
    setComparing(true);
    setNotice(null);
    try {
      const id = await compareRoles(selected);
      router.push(`/app/compare/${id}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't compare these roles.");
      setComparing(false);
    }
  }

  const open = useMemo(() => items.filter((a) => a.status === "interested" && a.verdict === "open"), [items]);
  const kpi = {
    open: open.length,
    closing: open.filter((a) => a.deadline && daysUntil(a.deadline) >= 0 && daysUntil(a.deadline) <= 14).length,
    applied: items.filter((a) => APPLIED_STATUSES.includes(a.status) && a.status !== "withdrawn").length,
    interviews: items.filter((a) => a.status === "interview" || a.status === "assessment").length,
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = open.filter(
      (a) =>
        (!track || a.track === track) &&
        (!q || [a.title, a.company, a.role, a.location, a.notes, a.what].some((v) => v?.toLowerCase().includes(q))),
    );
    const byNewest = (x: Application, y: Application) => y.created_at.localeCompare(x.created_at);
    if (sort === "best") return list.sort((x, y) => (y.score ?? 0) - (x.score ?? 0) || byNewest(x, y));
    if (sort === "closing")
      return list.sort((x, y) => (x.deadline ?? "9999").localeCompare(y.deadline ?? "9999") || byNewest(x, y));
    return list.sort(byNewest);
  }, [open, query, track, sort]);

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="pb-24">
      <div className="puzzle">
        <section className="hero span-7 flex flex-col justify-between gap-8">
          <div className="flex items-center justify-between gap-3">
            <span className="chip-tag">Your board</span>
            <span className="text-[13px] text-[var(--mute)]">{today}</span>
          </div>
          <div>
            <h1 className="display">
              Your applications. <em>One clear board.</em>
            </h1>
            <p className="mt-4 max-w-[520px] text-[16px] text-[var(--ink2)]">
              Paste any job link. Rookie reads it, gives you an <b className="text-[var(--ink)]">honest score out of 10</b>{" "}
              and writes a tailored CV and cover letter when you&apos;re ready.
            </p>
          </div>
        </section>
        <section className="span-5 kpis !grid-cols-2" aria-label="Your numbers">
          <div className="kpi">
            <b>{kpi.open}</b>
            <span>Open roles</span>
          </div>
          <div className="kpi">
            <b>{kpi.closing}</b>
            <span>Close in 14 days</span>
          </div>
          <div className="kpi">
            <b>{kpi.applied}</b>
            <span>Applied</span>
          </div>
          <div className="kpi">
            <b>{kpi.interviews}</b>
            <span>Interviews and tests</span>
          </div>
        </section>
      </div>

      {!hasProfile && !hideNudge && (
        <div className="mt-[var(--gap)] flex flex-wrap items-center justify-between gap-3 rounded-[var(--r)] border border-[var(--line)] px-6 py-4">
          <p className="text-[15px]">
            <strong>Add your profile</strong> so scores, &quot;why you&quot; and your CV and letters are about you.
          </p>
          <span className="flex gap-2">
            <Link href="/profile" className="btn !py-2">
              Set up profile
            </Link>
            <button type="button" className="btn btn-ghost !py-2" onClick={() => setHideNudge(true)}>
              Later
            </button>
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="tile mt-[var(--gap)] !p-4 sm:!p-6">
        <label htmlFor="core-input" className="mb-3 flex flex-wrap justify-between gap-2 text-[14px] text-[var(--ink2)]">
          <span>
            <span className="text-[var(--mute)]">[01]</span> Add a role
          </span>
          <span className="text-[var(--mute)]">Paste a job link, or type the role</span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="core-input"
            ref={inputRef}
            data-testid="core-input"
            type="text"
            className="field flex-1 !rounded-full !border-transparent !px-5 !py-4 shadow-[0_0_0_1px_var(--line)]"
            placeholder="https://… or Marketing Intern @ Spotify"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            disabled={!ready}
          />
          <button data-testid="core-submit" type="submit" className="btn btn-lg" disabled={saving || !ready}>
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error && (
          <p role="alert" className="alert mt-3">
            {error}
          </p>
        )}
      </form>

      {notice && (
        <p role="status" className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-[var(--card2)] px-4 py-3 text-sm">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </p>
      )}

      <section aria-labelledby="open-roles" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="open-roles" className="sec">
            <small>[02]</small> Open roles
          </h2>
          <span className="text-[13px] text-[var(--mute)]">{shown.length} shown</span>
        </div>

        {open.length > 0 && (
          <div className="mt-4 grid gap-3">
            <label className="sr-only" htmlFor="search">
              Search roles
            </label>
            <input
              id="search"
              type="search"
              className="field !rounded-full !px-5"
              placeholder="Search roles, companies, places, notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="pill" aria-pressed={!track} onClick={() => setTrack(null)}>
                  All
                </button>
                {TRACKS.filter((t) => open.some((a) => a.track === t)).map((t) => (
                  <button key={t} type="button" className="pill" aria-pressed={track === t} onClick={() => setTrack(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[var(--mute)]">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="pill !py-2">
                  <option value="best">Best chance</option>
                  <option value="closing">Closing soon</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3">
          {shown.map((a) => (
            <RoleCard
              key={a.id}
              a={a}
              selected={selected.includes(a.id)}
              onToggleCompare={() =>
                setSelected((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : s.length >= 4 ? s : [...s, a.id]))
              }
              onApply={async () => {
                await update(a.id, { status: "submitted" }, `${a.company ?? "Role"} moved to Applications. Its CV and letter are saved in your Library.`);
                await snapshot(a);
              }}
              onRemove={() => remove(a.id)}
              onRetry={a.job_url ? () => runAnalysis(a.id) : undefined}
              onSaveNotes={async (notes) => {
                const { error } = await createClient().from("applications").update({ notes }).eq("id", a.id);
                if (!error) patch(a.id, { notes });
                return !error;
              }}
            />
          ))}
        </div>

        {items.length === 0 && (
          <div className="card mt-4 text-center">
            <p className="text-lg font-semibold">No roles yet.</p>
            <p className="mt-1 text-[var(--ink2)]">Paste a job link or type a role you&apos;re interested in above.</p>
            <button
              type="button"
              className="btn btn-ghost mt-4"
              onClick={() =>
                add("Summer Analyst Intern @ Example Bank", {
                  deadline: isoInDays(10),
                  notes: "Example role. Mark it as applied, compare it, or remove it when you're ready.",
                })
              }
            >
              Add an example role
            </button>
          </div>
        )}
        {items.length > 0 && open.length === 0 && (
          <p className="mt-4 text-[var(--ink2)]">
            Nothing open right now. Check <Link href="/app/applications">Applications</Link> or{" "}
            <Link href="/app/barriers">Barriers</Link>.
          </p>
        )}
      </section>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 px-4">
          <div className="screen mx-auto flex max-w-[640px] flex-wrap items-center justify-between gap-3 !py-3 shadow-xl">
            <span className="text-sm">
              {selected.length} selected{selected.length < 2 ? ", pick one more" : ""}
              {selected.length >= 4 ? " (max 4)" : ""}
            </span>
            <span className="flex gap-2">
              <button type="button" className="btn btn-ghost !py-2" onClick={() => setSelected([])}>
                Clear
              </button>
              <button
                type="button"
                className="btn !border-white !bg-white !py-2 !text-[var(--ink)]"
                disabled={selected.length < 2 || comparing}
                onClick={compare}
              >
                {comparing ? "Comparing…" : `Compare ${selected.length}`}
              </button>
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
