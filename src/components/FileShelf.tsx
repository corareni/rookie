"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LibraryFile = { id: string; name: string; path: string; kind: string; size: number; created_at: string };
type Kind = { v: "cover_letter" | "cv" | "other"; label: string };

const MAX = 10 * 1024 * 1024;
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const kindLabel = (k: string) => (k === "cover_letter" ? "Cover Letter" : k === "cv" ? "CV" : "Document");

/**
 * Upload, download and delete files in the user's private storage folder.
 * Rookie reads each file's text once, so it can use letters for tone and documents (like transcripts) as facts.
 */
export default function FileShelf({
  userId,
  initial,
  ready,
  kinds,
  title,
  hint,
  tone = "tile-mint",
  successText,
  letterText,
  query = "",
}: {
  userId: string;
  initial: LibraryFile[];
  ready: boolean;
  kinds: Kind[];
  title: React.ReactNode;
  hint: string;
  tone?: string;
  /** Message after a successful upload; `letterText` replaces it for cover letters. */
  successText: string;
  letterText?: string;
  /** Optional search text; only matching files are listed. */
  query?: string;
}) {
  const [files, setFiles] = useState(initial);
  const [kind, setKind] = useState<Kind["v"]>(kinds[0].v);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const mine = files.filter((f) => kinds.some((k) => k.v === f.kind));
  const q = query.trim().toLowerCase();
  const shown = q ? mine.filter((f) => `${f.name} ${kindLabel(f.kind)}`.toLowerCase().includes(q)) : mine;

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) return setMsg({ ok: false, text: "Please upload a PDF or Word (.docx) file." });
    if (file.size > MAX) return setMsg({ ok: false, text: "That file is over 10 MB." });
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\- ]/g, "")}`;
    const up = await supabase.storage.from("library").upload(path, file, { contentType: file.type || undefined });
    if (up.error) {
      setBusy(false);
      return setMsg({ ok: false, text: `Couldn't upload: ${up.error.message}` });
    }
    const { data, error } = await supabase
      .from("library_files")
      .insert({ name: file.name, path, kind, size: file.size })
      .select("id,name,path,kind,size,created_at")
      .single();
    if (error) {
      await supabase.storage.from("library").remove([path]);
      setBusy(false);
      return setMsg({ ok: false, text: `Couldn't save: ${error.message}` });
    }
    setFiles((f) => [data as LibraryFile, ...f]);
    const res = await fetch("/api/library/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.id }),
    });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: kind === "cover_letter" && letterText ? letterText : successText } : { ok: true, text: "Saved. (Rookie couldn't read its text, so it won't use it for writing.)" });
    if (input.current) input.current.value = "";
  }

  async function download(f: LibraryFile) {
    const { data, error } = await createClient().storage.from("library").createSignedUrl(f.path, 60, { download: f.name });
    if (error || !data) return setMsg({ ok: false, text: "Couldn't open that file." });
    window.location.assign(data.signedUrl);
  }

  async function remove(f: LibraryFile) {
    const supabase = createClient();
    await supabase.storage.from("library").remove([f.path]);
    const { error } = await supabase.from("library_files").delete().eq("id", f.id);
    if (error) return setMsg({ ok: false, text: error.message });
    setFiles((list) => list.filter((x) => x.id !== f.id));
    setConfirm(null);
  }

  return (
    <div className="puzzle">
      <div className={`tile ${tone} ${mine.length ? "span-5" : "span-12"} grid content-start gap-3`}>
        <p className="text-[18px] leading-tight">{title}</p>
        <p className="text-[14px] text-[var(--ink2)]">{hint}</p>
        {kinds.length > 1 && (
          <>
            <label htmlFor={`kind-${kinds[0].v}`} className="label !mb-0">
              What is it?
            </label>
            <select
              id={`kind-${kinds[0].v}`}
              className="field !py-2 !text-[14px]"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind["v"])}
            >
              {kinds.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.label}
                </option>
              ))}
            </select>
          </>
        )}
        <label className={`btn justify-self-start ${busy || !ready ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Uploading…" : "Choose file"}
          <input
            ref={input}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={busy || !ready}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
        {!ready && <p className="text-[13px] text-[var(--ink2)]">Uploads switch on with the next database update.</p>}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-2xl bg-white px-3 py-2 text-[13.5px]" : "alert"}>
            {msg.text}
          </p>
        )}
      </div>
      {mine.length > 0 && (
      <div className="span-7 grid content-start gap-2.5">
        {shown.length === 0 && <p className="text-[14px] text-[var(--ink2)]">No files match &quot;{query}&quot;.</p>}
        {shown.map((f) => (
          <div key={f.id} className="tile !py-3.5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <span className="min-w-0">
              <b className="block truncate">{f.name}</b>
              <span className="text-[13px] text-[var(--mute)]">
                {kindLabel(f.kind)} · {date(f.created_at)} · {Math.max(1, Math.round(f.size / 1024))} KB
              </span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              <button type="button" className="act !min-h-[32px] !text-[12.5px]" onClick={() => download(f)}>
                ↓ Download
              </button>
              {confirm === f.id ? (
                <>
                  <button type="button" className="btn btn-danger !py-1.5 !text-[12.5px]" onClick={() => remove(f)}>
                    Delete
                  </button>
                  <button type="button" className="btn btn-ghost !py-1.5 !text-[12.5px]" onClick={() => setConfirm(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" className="act !min-h-[32px] !text-[12.5px] !text-[var(--bad)]" onClick={() => setConfirm(f.id)}>
                  Delete
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
