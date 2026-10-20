"use client";

import { useState } from "react";
import RoleCard from "@/components/RoleCard";
import type { Application } from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";

export default function VerdictList({
  initial,
  label,
  title,
  em,
  intro,
}: {
  initial: Application[];
  label: string;
  title: string;
  em: string;
  intro: string;
}) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, op: "move" | "remove") {
    const db = createClient().from("applications");
    const { error } = op === "move" ? await db.update({ verdict: "open" }).eq("id", id) : await db.delete().eq("id", id);
    if (error) return setError(error.message);
    setItems((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <main className="pb-16">
      <section className="hero">
        <span className="cap">
          {label} · {items.length} {items.length === 1 ? "role" : "roles"}
        </span>
        <h1 className="display mt-3">
          {title} <em>{em}</em>
        </h1>
        <p className="mt-4 max-w-[600px] text-[16px] text-[var(--ink2)]">{intro}</p>
      </section>
      {error && (
        <p role="alert" className="alert mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 grid gap-3">
        {items.map((a) => (
          <RoleCard key={a.id} a={a} onMoveToBoard={() => run(a.id, "move")} onRemove={() => run(a.id, "remove")} />
        ))}
        {items.length === 0 && <p className="text-[var(--ink2)]">Nothing here.</p>}
      </div>
    </main>
  );
}
