"use client";

import { useState } from "react";
import { emptyEntry, type Entry, type Link, type Project } from "@/lib/profile";

/** Repeatable experience / education / volunteering entries. */
export function EntryList({
  label,
  orgLabel,
  roleLabel,
  items,
  onChange,
}: {
  label: string;
  orgLabel: string;
  roleLabel: string;
  items: Entry[];
  onChange: (items: Entry[]) => void;
}) {
  const set = (i: number, patch: Partial<Entry>) => onChange(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-[15px] font-bold">{label}</legend>
      {items.map((e, i) => (
        <div key={i} className="grid gap-2 rounded-2xl bg-white p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextInput id={`${id}-${i}-org`} label={orgLabel} value={e.org} onChange={(v) => set(i, { org: v })} />
            <TextInput id={`${id}-${i}-role`} label={roleLabel} value={e.role} onChange={(v) => set(i, { role: v })} />
            <TextInput id={`${id}-${i}-loc`} label="Location" value={e.location} onChange={(v) => set(i, { location: v })} />
            <div className="grid grid-cols-2 gap-2">
              <TextInput id={`${id}-${i}-start`} label="From" value={e.start} onChange={(v) => set(i, { start: v })} />
              <TextInput id={`${id}-${i}-end`} label="To" value={e.end} onChange={(v) => set(i, { end: v })} />
            </div>
          </div>
          <label htmlFor={`${id}-${i}-bullets`} className="text-[12px] font-bold text-[var(--ink2)]">
            Bullet points, one per line
          </label>
          <textarea
            id={`${id}-${i}-bullets`}
            rows={Math.max(2, e.bullets.length + 1)}
            className="field !text-[14px]"
            value={e.bullets.join("\n")}
            onChange={(ev) => set(i, { bullets: ev.target.value.split("\n") })}
          />
          <div className="flex flex-wrap gap-2 text-[13px]">
            {i > 0 && (
              <button type="button" className="pill" onClick={() => move(i, -1)}>
                ↑ Up
              </button>
            )}
            {i < items.length - 1 && (
              <button type="button" className="pill" onClick={() => move(i, 1)}>
                ↓ Down
              </button>
            )}
            <button type="button" className="pill !text-[var(--bad)]" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="pill justify-self-start" onClick={() => onChange([...items, emptyEntry()])}>
        + Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </fieldset>
  );
}

export function ProjectList({ items, onChange }: { items: Project[]; onChange: (items: Project[]) => void }) {
  const set = (i: number, patch: Partial<Project>) => onChange(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-[15px] font-bold">Projects</legend>
      {items.map((p, i) => (
        <div key={i} className="grid gap-2 rounded-2xl bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextInput id={`proj-${i}-name`} label="Project" value={p.name} onChange={(v) => set(i, { name: v })} />
          <TextInput id={`proj-${i}-link`} label="Link (optional)" value={p.link} onChange={(v) => set(i, { link: v })} />
          <button type="button" className="pill !text-[var(--bad)]" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
          <div className="sm:col-span-3">
            <TextArea id={`proj-${i}-desc`} label="What you did" value={p.description} onChange={(v) => set(i, { description: v })} />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="pill justify-self-start"
        onClick={() => onChange([...items, { name: "", description: "", link: "" }])}
      >
        + Add project
      </button>
    </fieldset>
  );
}

export function LinkList({ items, onChange }: { items: Link[]; onChange: (items: Link[]) => void }) {
  const set = (i: number, patch: Partial<Link>) => onChange(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[15px] font-bold">Links</legend>
      <p className="-mt-1 text-[13px] text-[var(--ink2)]">GitHub, portfolio, website, LinkedIn, anything worth showing.</p>
      {items.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <TextInput id={`link-${i}-label`} label="Label" value={l.label} onChange={(v) => set(i, { label: v })} />
          <TextInput id={`link-${i}-url`} label="URL" value={l.url} onChange={(v) => set(i, { url: v })} />
          <button type="button" className="pill !text-[var(--bad)]" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="pill justify-self-start" onClick={() => onChange([...items, { label: "", url: "" }])}>
        + Add link
      </button>
    </fieldset>
  );
}

/** A list of short items shown as removable chips. */
export function ChipList({
  label,
  hint,
  items,
  onChange,
  tone = "bg-white",
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  tone?: string;
}) {
  const [draft, setDraft] = useState("");
  const id = `chip-${label.toLowerCase().replace(/\W+/g, "-")}`;
  const add = () => {
    const parts = draft
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x && !items.includes(x));
    if (parts.length) onChange([...items, ...parts]);
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      {hint && <p className="text-[13px] text-[var(--ink2)]">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((x) => (
          <span key={x} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] ${tone}`}>
            {x}
            <button type="button" aria-label={`Remove ${x}`} className="px-1" onClick={() => onChange(items.filter((y) => y !== x))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          className="field !py-2 !text-[14px]"
          placeholder="Type and press Enter (commas add several)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-ghost !py-2" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

export function TextInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
        {label}
      </label>
      <input id={id} className="field !py-2 !text-[14px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 2,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-bold text-[var(--ink2)]">
        {label}
      </label>
      <textarea id={id} rows={rows} className="field !text-[14px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
