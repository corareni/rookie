"use client";

import Link from "next/link";
import CompanyRole from "@/components/CompanyRole";
import FileShelf, { type LibraryFile } from "@/components/FileShelf";

export type CurrentDoc = { id: string; label: string; status: string; updated: string; kinds: ("cv" | "cover_letter")[] };
export type SavedDoc = { id: string; application_id: string | null; label: string; kind: "cv" | "cover_letter"; created_at: string };
export type { LibraryFile };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
  files,
  ready,
}: {
  userId: string;
  current: CurrentDoc[];
  saved: SavedDoc[];
  files: LibraryFile[];
  ready: boolean;
}) {
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


      <section className="mt-10" aria-labelledby="cur-h">
        <h2 id="cur-h" className="sec">
          <small>[01]</small> Your applications
        </h2>
        <div className="mt-3 grid gap-2.5">
          {current.map((c) => (
            <div key={c.id} className="tile !py-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Link href={`/app/a/${c.id}#documents`} className="text-[18px] no-underline hover:underline">
                  <CompanyRole label={c.label} />
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
                <CompanyRole label={s.label} />{" "}
                <span className="font-light text-[var(--mute)]">
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
        <div className="mt-3">
          <FileShelf
            userId={userId}
            initial={files}
            ready={ready}
            kinds={[
              { v: "cover_letter", label: "Cover letter" },
              { v: "cv", label: "CV" },
              { v: "other", label: "Transcript, certificate or other document" },
            ]}
            title={
              <>
                <b>Upload a letter</b> <span className="font-light">you wrote before.</span>
              </>
            }
            hint="Rookie uses your own cover letters as a reference for your tone and structure, never as facts. PDF or Word, up to 10 MB. Only you can see your files."
            successText="Saved."
            letterText="Saved. Rookie will use it as a style reference for new letters."
          />
        </div>
      </section>
    </main>
  );
}
