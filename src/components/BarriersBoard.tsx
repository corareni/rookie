"use client";

import Link from "next/link";
import { useState } from "react";
import RoleCard from "@/components/RoleCard";
import type { Application, Verdict } from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";

export default function BarriersBoard({ initial }: { initial: Application[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function setVerdict(id: string, verdict: Verdict) {
    const { error } = await createClient().from("applications").update({ verdict }).eq("id", id);
    if (error) return setError(error.message);
    setItems((prev) => (verdict === "open" ? prev.filter((a) => a.id !== id) : prev.map((a) => (a.id === id ? { ...a, verdict } : a))));
  }

  async function deleteForever(id: string) {
    const { error } = await createClient().from("applications").delete().eq("id", id);
    if (error) return setError(error.message);
    setItems((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
  }

  const review = items.filter((a) => a.verdict === "barrier");
  const ruled = items.filter((a) => a.verdict === "ruled_out");
  const bin = items.filter((a) => a.verdict === "binned");

  return (
    <main>
      <div className="puzzle">
        <section className="hero span-8">
          <span className="chip-tag">Barriers</span>
          <h1 className="display mt-5">
            Worth a second look. <em>You decide.</em>
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px] text-[var(--ink2)]">
            rookie checks every role against the barriers in your <Link href="/profile">profile</Link>. Roles that clash land
            here first. Move them back to your board, or rule them out. Ruled-out roles can go to the bin, and the bin only
            empties when you say so.
          </p>
        </section>
        <section className="tile tile-sky span-4 grid content-between gap-6">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ["To review", review.length],
              ["Ruled out", ruled.length],
              ["Bin", bin.length],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-2xl bg-white px-2 py-3">
                <dd className="text-[30px] font-bold leading-none">{v}</dd>
                <dt className="mt-1 text-[12px] text-[var(--ink2)]">{k}</dt>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-[var(--ink2)]">
            <span className="chip chip-bad mr-1">Deal-breaker</span> a hard no.{" "}
            <span className="chip chip-warn mx-1">Concern</span> worth checking.
          </p>
        </section>
      </div>

      {error && (
        <p role="alert" className="alert mt-4">
          {error}
        </p>
      )}

      <Section n="01" title="To review" empty="Nothing to review. New roles that clash with your barriers show up here.">
        {review.map((a) => (
          <RoleCard
            key={a.id}
            a={a}
            actions={
              <>
                <button type="button" className="btn !py-2" onClick={() => setVerdict(a.id, "open")}>
                  Move to board
                </button>
                <button type="button" className="btn btn-ghost !py-2" onClick={() => setVerdict(a.id, "ruled_out")}>
                  Rule out
                </button>
              </>
            }
          />
        ))}
      </Section>

      <Section n="02" title="Ruled out" empty="Nothing ruled out.">
        {ruled.map((a) => (
          <RoleCard
            key={a.id}
            a={a}
            actions={
              <>
                <button type="button" className="btn btn-ghost !py-2" onClick={() => setVerdict(a.id, "open")}>
                  Back to board
                </button>
                <button type="button" className="btn btn-ghost !py-2" onClick={() => setVerdict(a.id, "binned")}>
                  Move to bin
                </button>
              </>
            }
          />
        ))}
      </Section>

      <Section n="03" title="Bin" empty="The bin is empty.">
        {bin.map((a) => (
          <RoleCard
            key={a.id}
            a={a}
            actions={
              confirmDelete === a.id ? (
                <>
                  <button type="button" className="btn btn-danger !py-2" onClick={() => deleteForever(a.id)}>
                    Delete forever
                  </button>
                  <button type="button" className="btn btn-ghost !py-2" onClick={() => setConfirmDelete(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost !py-2" onClick={() => setVerdict(a.id, "ruled_out")}>
                    Restore
                  </button>
                  <button type="button" className="btn btn-ghost !py-2 !text-[var(--bad)]" onClick={() => setConfirmDelete(a.id)}>
                    Delete…
                  </button>
                </>
              )
            }
          />
        ))}
      </Section>
    </main>
  );
}

function Section({ n, title, empty, children }: { n: string; title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-10" aria-labelledby={`sec-${n}`}>
      <h2 id={`sec-${n}`} className="sec">
        <small>[{n}]</small> {title} <span className="font-light text-[var(--mute)]">· {children.length}</span>
      </h2>
      <div className="mt-3 grid gap-3">
        {children.length ? children : <p className="text-[14px] text-[var(--ink2)]">{empty}</p>}
      </div>
    </section>
  );
}
