"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CurrentDoc = { id: string; label: string; status: string; updated: string; kinds: ("cv" | "cover_letter")[] };
export type SavedDoc = { id: string; application_id: string | null; label: string; kind: "cv" | "cover_letter"; created_at: string };
export type LibraryFile = { id: string; name: string; path: string; kind: string; size: number; created_at: string; hasText?: boolean };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const MAX = 10 * 1024 * 1024;

function Downloads({ base, kind, saved }: { base: string; kind: "cv" | "cover_letter"; saved?: string }) {
  const file = kind === "cv" ? "cv" : "letter";
  const q = saved ? `?saved=${saved}` : "";
  return (
    <span className="flex gap-1.5">
      <a className="act !min-h-[32px] !px-3 !text-[12.5px] !bg-[var(--mint)]" href={`${base}/${file}.pdf${q}`}>
        ↓ PDF
      </a>
      <a className="act !min-h-[32px] !px-3 !text-[12.5px] !bg-[var(--lilac)]" href={`${base}/${file}.docx${q}`}>
        ↓ Word
      </a>
    </span>
  );
}

export default function LibraryView({
  userId,
  current,
  saved,
  files: initialFiles,
  ready,
}: {
  userId: string;
  current: CurrentDoc[];
  saved: SavedDoc[];
  files: LibraryFile[];
  ready: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [kind, setKind] = useState("cover_letter");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

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
    // Read the text so Rookie can learn your tone from it (letters only matter for writing).
    const res = await fetch("/api/library/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.id }),
    });
    setBusy(false);
    setMsg(
      res.ok
        ? { ok: true, text: kind === "cover_letter" ? "Saved. Rookie will use it as a style reference for new letters." : "Saved." }
        : { ok: true, text: "Saved. (Rookie couldn't read its text, so it won't be used as a style reference.)" },
    );
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
    router.refresh();
  }

  return (
    <main className="pb-16">
      <div className="puzzle">
        <section className="hero span-8">
          <span className="chip-tag">Library</span>
          <h1 className="display mt-5">
            Every document. <em>Always there.</em>
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px] text-[var(--ink2)]">
            Your tailored CVs and cover letters, the versions you actually sent, and your own letters for Rookie to learn
            your voice from. Download any of them as PDF or Word.
          </p>
        </section>
        <section className="tile span-4 grid content-center gap-2">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Current", current.length],
              ["Sent", saved.length],
              ["Uploaded", files.length],
            ].map(([k, v], i) => (
              <div key={k as string} className={`rounded-2xl px-2 py-3 ${i === 0 ? "bg-[var(--lilac)]" : "bg-white"}`}>
                <dd className="text-[30px] font-bold leading-none">{v}</dd>
                <dt className="mt-1 text-[12px] text-[var(--ink2)]">{k}</dt>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-4 ${msg.ok ? "chip chip-good !px-4 !py-2" : "alert"}`}>
          {msg.text}
        </p>
      )}

      <section className="mt-10" aria-labelledby="cur-h">
        <h2 id="cur-h" className="sec">
          <small>[01]</small> Your applications
        </h2>
        <div className="mt-3 grid gap-2.5">
          {current.map((c) => (
            <div key={c.id} className="tile !py-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Link href={`/app/a/${c.id}#documents`} className="text-[17px] font-bold no-underline hover:underline">
                  {c.label}
                </Link>
                <p className="text-[13px] text-[var(--mute)]">Updated {date(c.updated)}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["cv", "cover_letter"] as const)
                  .filter((k) => c.kinds.includes(k))
                  .map((k) => (
                    <span key={k} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                      <b className="text-[13px]">{k === "cv" ? "CV" : "Cover letter"}</b>
                      <Downloads base={`/api/documents/${c.id}`} kind={k} />
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {current.length === 0 && (
            <p className="text-[14px] text-[var(--ink2)]">
              Nothing yet. Open a role on your <Link href="/app">board</Link> and press &quot;Write my CV and cover letter&quot;.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="sent-h">
        <h2 id="sent-h" className="sec">
          <small>[02]</small> Sent versions <span className="font-light text-[var(--mute)]">· saved when you mark a role as applied</span>
        </h2>
        <div className="mt-3 grid gap-2.5">
          {saved.map((s) => (
            <div key={s.id} className="tile !py-3.5 flex flex-wrap items-center justify-between gap-3">
              <span>
                <b>{s.label || "Application"}</b>{" "}
                <span className="font-light text-[var(--ink2)]">
                  · {s.kind === "cv" ? "CV" : "Cover letter"} · {date(s.created_at)}
                </span>
              </span>
              <Downloads base={`/api/documents/${s.application_id ?? "saved"}`} kind={s.kind} saved={s.id} />
            </div>
          ))}
          {saved.length === 0 && (
            <p className="text-[14px] text-[var(--ink2)]">
              {ready ? "When you mark a role as applied, the CV and letter you sent are kept here." : "The library is almost ready. It switches on with the next database update."}
            </p>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="own-h">
        <h2 id="own-h" className="sec">
          <small>[03]</small> Your own letters and CVs
        </h2>
        <div className="puzzle mt-3">
          <div className="tile tile-mint span-5 grid content-start gap-3">
            <p className="text-[18px] leading-tight">
              <b>Upload a letter</b> <span className="font-light">you wrote before.</span>
            </p>
            <p className="text-[14px] text-[var(--ink2)]">
              Rookie uses your own cover letters as a reference for your tone and structure, never as facts. PDF or Word,
              up to 10 MB. Only you can see your files.
            </p>
            <label htmlFor="lib-kind" className="label !mb-0">
              What is it?
            </label>
            <select id="lib-kind" className="field !py-2 !text-[14px]" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="cover_letter">Cover letter</option>
              <option value="cv">CV</option>
              <option value="other">Other document</option>
            </select>
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
          </div>
          <div className="span-7 grid content-start gap-2.5">
            {files.map((f) => (
              <div key={f.id} className="tile !py-3.5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <b className="block truncate">{f.name}</b>
                  <span className="text-[13px] text-[var(--mute)]">
                    {f.kind === "cover_letter" ? "Cover letter" : f.kind === "cv" ? "CV" : "Document"} · {date(f.created_at)} ·{" "}
                    {Math.max(1, Math.round(f.size / 1024))} KB
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
            {files.length === 0 && <p className="text-[14px] text-[var(--ink2)]">No files yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
