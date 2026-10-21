"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CalendarButtons from "@/components/CalendarButtons";
import { EventDetails, EventDialog, toLocalInput, type Draft } from "@/components/CalendarEvents";
import { buildEvent } from "@/components/EventPanel";
import { titleCase } from "@/lib/applications";

export type CalItem = {
  appId: string;
  company: string;
  role: string | null;
  job_url: string | null;
  next_step: string | null;
  kind: "applied" | "deadline" | "assessment" | "interview" | "offer" | "scheduled";
  /** All-day items use `day` (YYYY-MM-DD); scheduled ones use `at` (ISO date-time). */
  day?: string;
  at?: string;
  minutes?: number;
  location?: string | null;
  eventKind?: "interview" | "assessment" | "other" | null;
};

const KIND: Record<CalItem["kind"], { label: string; tone: string }> = {
  scheduled: { label: "Scheduled", tone: "bg-[var(--sky)]" },
  interview: { label: "Interview stage", tone: "bg-[var(--lilac)]" },
  assessment: { label: "Assessment stage", tone: "bg-[var(--butter)]" },
  applied: { label: "Applied", tone: "bg-[var(--tile2)]" },
  deadline: { label: "Deadline", tone: "bg-[var(--peach)]" },
  offer: { label: "Offer", tone: "bg-[var(--goodbg)]" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOf = (i: CalItem) => (i.at ? localDay(new Date(i.at)) : i.day!);
const timeOf = (i: CalItem) => (i.at ? new Date(i.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
const scheduledLabel = (i: CalItem) => (i.eventKind === "assessment" ? "Assessment" : i.eventKind === "other" ? "Next step" : "Interview");
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month grid plus a "coming up" list: when you applied, deadlines, stages reached and scheduled interviews or tests. */
export default function CalendarView({ items, roles = [] }: { items: CalItem[]; roles?: { id: string; name: string }[] }) {
  const today = localDay(new Date());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<CalItem | null>(null);
  const taken = Object.fromEntries(items.filter((i) => i.kind === "scheduled").map((i) => [i.appId, i.at!]));

  /** New event on a given day (9:00), or at the next full hour. */
  const add = (day?: Date) => {
    const at = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9) : new Date(Date.now() + 3600_000);
    if (!day) at.setMinutes(0, 0, 0);
    setDraft({ appId: "", local: toLocalInput(at), minutes: 60, kind: "interview", location: "" });
  };
  const edit = (i: CalItem) => {
    setOpen(null);
    setDraft({
      appId: i.appId,
      local: toLocalInput(new Date(i.at!)),
      minutes: i.minutes ?? 60,
      kind: i.eventKind ?? "interview",
      location: i.location ?? "",
    });
  };
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const i of items) {
      const k = dayOf(i);
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    for (const list of m.values()) list.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
    return m;
  }, [items]);

  // Monday-first grid covering the whole month.
  const cells = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    const days = Math.ceil((offset + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: days }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  const upcoming = items
    .filter((i) => dayOf(i) >= today && (i.kind === "scheduled" || i.kind === "deadline"))
    .sort((a, b) => (a.at ?? `${a.day}T23:59`).localeCompare(b.at ?? `${b.day}T23:59`))
    .slice(0, 8);

  const monthName = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const inMonth = items.filter((i) => dayOf(i).startsWith(`${month.getFullYear()}-${pad(month.getMonth() + 1)}`));
  const count = (k: CalItem["kind"]) => inMonth.filter((i) => i.kind === k).length;

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <main className="pb-16">
      <div className="puzzle">
        <section className="hero span-7 flex flex-col justify-between gap-6">
          <span className="chip-tag self-start">Calendar</span>
          <div>
            <h1 className="display">
              Every date. <em>At a glance.</em>
            </h1>
            <p className="mt-4 max-w-[540px] text-[16px] text-[var(--ink2)]">
              When you applied and where, which deadlines are coming, and when your interviews and assessments are. Press
              ＋ to add an event, or click one to edit or delete it.
            </p>
          </div>
        </section>
        <section className="span-5 kpis !grid-cols-2" aria-label={`This month: ${monthName}`}>
          <div className="kpi">
            <b>{count("scheduled")}</b>
            <span>Interviews and tests scheduled</span>
          </div>
          <div className="kpi">
            <b>{count("applied")}</b>
            <span>Applications sent</span>
          </div>
          <div className="kpi">
            <b>{count("deadline")}</b>
            <span>Deadlines</span>
          </div>
          <div className="kpi">
            <b>{count("offer")}</b>
            <span>Offers</span>
          </div>
        </section>
      </div>

      <div className="puzzle mt-[var(--gap)]">
        {/* Month grid (laptops and tablets) */}
        <section className="tile span-8 max-md:hidden" aria-labelledby="month-h">
          <div className="flex items-center justify-between gap-3">
            <h2 id="month-h" className="text-[24px] tracking-tight">
              <b>{monthName.split(" ")[0]}</b> <span className="font-light">{monthName.split(" ")[1]}</span>
            </h2>
            <span className="flex gap-1.5">
              <button type="button" className="act !min-h-[34px] !px-3 !bg-[var(--black)] !text-[var(--onblack)]" onClick={() => add()}>
                ＋ Add event
              </button>
              <button type="button" className="act !min-h-[34px] !px-3" aria-label="Previous month" onClick={() => shift(-1)}>
                ←
              </button>
              <button type="button" className="act !min-h-[34px] !px-3" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Today
              </button>
              <button type="button" className="act !min-h-[34px] !px-3" aria-label="Next month" onClick={() => shift(1)}>
                →
              </button>
            </span>
          </div>
          <div className="mt-4 grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1.5" role="grid" aria-label={monthName}>
            {WEEKDAYS.map((w) => (
              <div key={w} role="columnheader" className="pb-1 text-center text-[12px] text-[var(--mute)]">
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const key = localDay(d);
              const list = byDay.get(key) ?? [];
              const other = d.getMonth() !== month.getMonth();
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-label={`${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${list.length ? `, ${list.length} item${list.length > 1 ? "s" : ""}` : ""}`}
                  className={`group min-h-[96px] min-w-0 rounded-[12px] p-1.5 ${other ? "bg-transparent opacity-45" : "bg-white"} ${key === today ? "ring-2 ring-[var(--ink)]" : ""}`}
                >
                  <p className="flex items-center justify-between">
                    <span className={`text-[12px] ${key === today ? "font-bold" : "text-[var(--ink2)]"}`}>{d.getDate()}</span>
                    <button
                      type="button"
                      className="grid size-5 place-items-center rounded-full text-[13px] leading-none text-[var(--ink2)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--sky)] focus-visible:opacity-100"
                      aria-label={`Add an event on ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
                      onClick={() => add(d)}
                    >
                      ＋
                    </button>
                  </p>
                  <ul className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
                    {list.slice(0, 3).map((i, n) => (
                      <li key={n} className="min-w-0">
                        {i.kind === "scheduled" ? (
                          <button
                            type="button"
                            className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ${KIND[i.kind].tone}`}
                            title={`${scheduledLabel(i)}: ${i.company}`}
                            onClick={() => setOpen(i)}
                          >
                            <b>{timeOf(i)} </b>
                            {i.company}
                          </button>
                        ) : (
                          <Link
                            href={`/app/a/${i.appId}`}
                            className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight no-underline ${KIND[i.kind].tone}`}
                            title={`${KIND[i.kind].label}: ${i.company}`}
                          >
                            {i.company}
                          </Link>
                        )}
                      </li>
                    ))}
                    {list.length > 3 && <li className="px-1 text-[11px] text-[var(--mute)]">+{list.length - 3} more</li>}
                  </ul>
                </div>
              );
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2 text-[12px]" aria-label="Legend">
            {(Object.keys(KIND) as CalItem["kind"][]).map((k) => (
              <li key={k} className={`rounded-full px-2.5 py-1 ${KIND[k].tone}`}>
                {KIND[k].label}
              </li>
            ))}
          </ul>
        </section>

        {/* Coming up (and the whole view on phones) */}
        <section className="tile tile-sky span-4 grid min-w-0 content-start gap-3" aria-labelledby="next-h">
          <div className="flex items-center justify-between gap-2">
            <h2 id="next-h" className="text-[20px] tracking-tight">
              <b>Coming up</b> <span className="font-light">next</span>
            </h2>
            <button
              type="button"
              className="act !min-h-[34px] !px-3 !bg-[var(--black)] !text-[var(--onblack)] md:hidden"
              onClick={() => add()}
            >
              ＋ Add event
            </button>
          </div>
          {upcoming.length === 0 && (
            <p className="text-[14px] text-[var(--ink2)]">
              Nothing scheduled. Press ＋ to add an interview or assessment.
            </p>
          )}
          <ul className="grid gap-2">
            {upcoming.map((i, n) => {
              const event =
                i.kind === "scheduled"
                  ? buildEvent(
                      { id: i.appId, company: i.company, role: i.role, title: i.company, job_url: i.job_url, next_step: i.next_step },
                      { event_at: i.at!, event_minutes: i.minutes ?? 60, event_location: i.location ?? null, event_kind: i.eventKind ?? null },
                    )
                  : null;
              return (
                <li key={n} className="grid min-w-0 gap-2 rounded-2xl bg-white p-3">
                  <span className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className={`rounded-full px-2 py-0.5 font-bold ${KIND[i.kind].tone}`}>
                      {i.kind === "scheduled" ? scheduledLabel(i) : KIND[i.kind].label}
                    </span>
                    <span className="text-[var(--ink2)]">
                      {new Date(i.at ?? `${i.day}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {i.at && `, ${timeOf(i)}`}
                    </span>
                  </span>
                  <Link href={`/app/a/${i.appId}`} className="text-[15px] leading-snug no-underline hover:underline">
                    <b>{i.company}</b> {i.role && <span className="font-light">{titleCase(i.role)}</span>}
                  </Link>
                  {i.location && <span className="text-[12.5px] text-[var(--ink2)]">{i.location}</span>}
                  {event && <CalendarButtons event={event} small />}
                  {event && (
                    <span className="flex gap-3 text-[12.5px]">
                      <button type="button" className="font-bold text-[var(--ink2)] hover:text-[var(--ink)]" onClick={() => edit(i)}>
                        Edit
                      </button>
                      <button type="button" className="font-bold text-[var(--mute)] hover:text-[var(--bad)]" onClick={() => setOpen(i)}>
                        Delete
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Phones: this month's other dates as a simple list */}
          <div className="md:hidden">
            <h3 className="mt-2 text-[15px] font-bold">{monthName}</h3>
            <ul className="mt-2 grid gap-1.5">
              {inMonth
                .sort((a, b) => (a.at ?? `${a.day}T00:00`).localeCompare(b.at ?? `${b.day}T00:00`))
                .map((i, n) => (
                  <li key={n} className="flex min-w-0 items-center gap-2 text-[13px]">
                    <span className="w-[54px] flex-none text-[var(--ink2)]">
                      {new Date(i.at ?? `${i.day}T12:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] ${KIND[i.kind].tone}`}>
                      {i.kind === "scheduled" ? scheduledLabel(i) : KIND[i.kind].label}
                    </span>
                    {i.kind === "scheduled" ? (
                      <button type="button" className="min-w-0 truncate text-left font-bold underline" onClick={() => setOpen(i)}>
                        {i.company}
                      </button>
                    ) : (
                      <span className="min-w-0 truncate font-bold">{i.company}</span>
                    )}
                  </li>
                ))}
              {inMonth.length === 0 && <li className="text-[13px] text-[var(--ink2)]">Nothing this month.</li>}
            </ul>
            <span className="mt-3 flex gap-1.5">
              <button type="button" className="act !min-h-[32px] !px-3" aria-label="Previous month" onClick={() => shift(-1)}>
                ←
              </button>
              <button type="button" className="act !min-h-[32px] !px-3" aria-label="Next month" onClick={() => shift(1)}>
                →
              </button>
            </span>
          </div>
        </section>
      </div>
      <EventDialog draft={draft} roles={roles} taken={taken} onClose={() => setDraft(null)} />
      <EventDetails item={open} onClose={() => setOpen(null)} onEdit={edit} />
    </main>
  );
}
