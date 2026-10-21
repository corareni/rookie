"use client";

import { useState } from "react";
import { emptyEntry, type Entry, type Link, type Project } from "@/lib/profile";

/**
 * Which entries are open for editing. Saved entries are read-only toggles until you press Edit;
 * every save (a new `version`) closes them all again.
 */
function useEditing(version: number) {
  const [open, setOpen] = useState<number[]>([]);
  const [seen, setSeen] = useState(version);
  if (version !== seen) {
    setSeen(version);
    setOpen([]);
  }
  return {
    is: (i: number) => open.includes(i),
    edit: (i: number) => setOpen((o) => [...o, i]),
    done: (i: number) => setOpen((o) => o.filter((x) => x !== i)),
    /** Keep the right entries open when one moves or is removed. */
    moved: (a: number, b: number) => setOpen((o) => o.map((x) => (x === a ? b : x === b ? a : x))),
    removed: (i: number) => setOpen((o) => o.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))),
  };
}

/** A saved entry: a toggle showing its name, with the details and an Edit button inside. */
function ReadOnly({
  title,
  sub,
  onEdit,
  children,
}: {
  title: string;
  sub?: string;
  onEdit: () => void;
  children?: React.ReactNode;
}) {
  return (
    <details className="entry group rounded-2xl bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <b className="text-[15px]">{title}</b>
          {sub && (
            <span className="block truncate text-[13px] font-light text-[var(--ink2)] sm:inline sm:pl-2">{sub}</span>
          )}
        </span>
        <span aria-hidden="true" className="flex-none text-[var(--mute)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid gap-2 px-4 pb-4 text-[14px] text-[var(--ink2)]">
        {children}
        <button type="button" className="pill justify-self-start !text-[13px]" onClick={onEdit}>
          ✎ Edit
        </button>
      </div>
    </details>
  );
}

/** Repeatable experience / education / volunteering entries. */
export function EntryList({
  label,
  orgLabel,
  roleLabel,
  items,
  onChange,
  version = 0,
}: {
  label: string;
  orgLabel: string;
  roleLabel: string;
  items: Entry[];
  onChange: (items: Entry[]) => void;
  /** Goes up with every profile save, which closes all entries. */
  version?: number;
}) {
  const editing = useEditing(version);
  const set = (i: number, patch: Partial<Entry>) => onChange(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    editing.moved(i, i + d);
    onChange(next);
  };
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-[15px] font-bold">{label}</legend>
      {items.map((e, i) =>
        !editing.is(i) ? (
          <ReadOnly
            key={i}
            title={e.org || e.role || "Untitled"}
            sub={[e.org ? e.role : "", [e.start, e.end].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}
            onEdit={() => editing.edit(i)}
          >
            {e.location && <p>{e.location}</p>}
            {e.bullets.some((b) => b.trim()) && (
              <ul className="list-disc pl-5">
                {e.bullets
                  .filter((b) => b.trim())
                  .map((b, n) => (
                    <li key={n}>{b}</li>
                  ))}
              </ul>
            )}
          </ReadOnly>
        ) : (
          <div key={i} className="grid gap-2 rounded-2xl bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput id={`${id}-${i}-org`} label={orgLabel} value={e.org} onChange={(v) => set(i, { org: v })} />
              <TextInput
                id={`${id}-${i}-role`}
                label={roleLabel}
                value={e.role}
                onChange={(v) => set(i, { role: v })}
              />
              <TextInput
                id={`${id}-${i}-loc`}
                label="Location"
                value={e.location}
                onChange={(v) => set(i, { location: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  id={`${id}-${i}-start`}
                  label="From"
                  value={e.start}
                  onChange={(v) => set(i, { start: v })}
                />
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
              <button
                type="button"
                className="pill !text-[var(--bad)]"
                onClick={() => {
                  editing.removed(i);
                  onChange(items.filter((_, j) => j !== i));
                }}
              >
                Remove
              </button>
              <button type="button" className="pill pill-done ml-auto" onClick={() => editing.done(i)}>
                ✓ Done
              </button>
            </div>
          </div>
        ),
      )}
      <button
        type="button"
        className="pill justify-self-start"
        onClick={() => {
          editing.edit(items.length);
          onChange([...items, emptyEntry()]);
        }}
      >
        + Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </fieldset>
  );
}

export function ProjectList({
  items,
  onChange,
  version = 0,
}: {
  items: Project[];
  onChange: (items: Project[]) => void;
  version?: number;
}) {
  const editing = useEditing(version);
  const set = (i: number, patch: Partial<Project>) => onChange(items.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-[15px] font-bold">Projects</legend>
      {items.map((p, i) =>
        !editing.is(i) ? (
          <ReadOnly key={i} title={p.name || "Untitled project"} sub={p.link} onEdit={() => editing.edit(i)}>
            {p.description && <p className="whitespace-pre-line">{p.description}</p>}
          </ReadOnly>
        ) : (
          <div key={i} className="grid gap-2 rounded-2xl bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextInput id={`proj-${i}-name`} label="Project" value={p.name} onChange={(v) => set(i, { name: v })} />
            <TextInput
              id={`proj-${i}-link`}
              label="Link (optional)"
              value={p.link}
              onChange={(v) => set(i, { link: v })}
            />
            <button
              type="button"
              className="pill !text-[var(--bad)]"
              onClick={() => {
                editing.removed(i);
                onChange(items.filter((_, j) => j !== i));
              }}
            >
              Remove
            </button>
            <div className="sm:col-span-3">
              <TextArea
                id={`proj-${i}-desc`}
                label="What you did"
                value={p.description}
                onChange={(v) => set(i, { description: v })}
              />
            </div>
            <button
              type="button"
              className="pill pill-done justify-self-end sm:col-span-3"
              onClick={() => editing.done(i)}
            >
              ✓ Done
            </button>
          </div>
        ),
      )}
      <button
        type="button"
        className="pill justify-self-start"
        onClick={() => {
          editing.edit(items.length);
          onChange([...items, { name: "", description: "", link: "" }]);
        }}
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
      <p className="-mt-1 text-[13px] text-[var(--ink2)]">
        GitHub, portfolio, website, LinkedIn, anything worth showing.
      </p>
      {items.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <TextInput id={`link-${i}-label`} label="Label" value={l.label} onChange={(v) => set(i, { label: v })} />
          <TextInput id={`link-${i}-url`} label="URL" value={l.url} onChange={(v) => set(i, { url: v })} />
          <button
            type="button"
            className="pill !text-[var(--bad)]"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="pill justify-self-start"
        onClick={() => onChange([...items, { label: "", url: "" }])}
      >
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
            <button
              type="button"
              aria-label={`Remove ${x}`}
              className="px-1"
              onClick={() => onChange(items.filter((y) => y !== x))}
            >
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

export function TextInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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
      <textarea
        id={id}
        rows={rows}
        className="field !text-[14px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
