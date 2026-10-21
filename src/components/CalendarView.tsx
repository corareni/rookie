"use client";

import { useMemo, useState } from "react";
import { EventDetails, EventDialog, toLocalInput, type Draft } from "@/components/CalendarEvents";
import { titleCase } from "@/lib/applications";

export type CalItem = {
  appId: string;
  company: string;
  role: string | null;
  job_url: string | null;
  next_step: string | null;
  /** Where the job is (from the job ad), and its current status. */
  place?: string | null;
  status?: string;
  kind: "applied" | "deadline" | "assessment" | "interview" | "offer" | "scheduled";
  /** All-day items use `day` (YYYY-MM-DD); scheduled ones use `at` (ISO date-time). */
  day?: string;
  at?: string;
  minutes?: number;
  location?: string | null;
  eventKind?: "interview" | "assessment" | "other" | null;
};

export const KIND: Record<CalItem["kind"], { label: string; tone: string }> = {
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
export const itemLabel = (i: CalItem) =>
  i.kind === "scheduled" ? (i.eventKind === "assessment" ? "Assessment" : i.eventKind === "other" ? "Next step" : "Interview") : KIND[i.kind].label;
const sortKey = (i: CalItem) => i.at ?? `${i.day}T00:00`;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mondayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayName = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

const ctl = "act !min-h-[34px] !px-3";

/** One clickable entry; opens its details. `big` is the week view's card. */
function Entry({ i, big = false, onOpen }: { i: CalItem; big?: boolean; onOpen: (i: CalItem) => void }) {
  return (
    <button
      type="button"
      className={`block w-full min-w-0 text-left leading-tight transition-[filter] hover:brightness-95 ${KIND[i.kind].tone} ${
        big ? "rounded-[10px] px-2 py-1.5 text-[12px]" : "truncate rounded-md px-1.5 py-0.5 text-[11px]"
      }`}
      title={`${itemLabel(i)}: ${i.company}`}
      onClick={() => onOpen(i)}
    >
      {big ? (
        <>
          <span className="block text-[10.5px] text-[var(--ink2)]">
            {i.at ? <b className="text-[var(--ink)]">{timeOf(i)}</b> : "All day"} · {itemLabel(i)}
          </span>
          <b className="block break-words">{i.company}</b>
          {i.role && <span className="line-clamp-2 block break-words font-light">{titleCase(i.role)}</span>}
        </>
      ) : (
        <>
          {i.at && <b>{timeOf(i)} </b>}
          {i.company}
        </>
      )}
    </button>
  );
}

/** Week or month view plus a "coming up" list: applications, deadlines, stages reached and scheduled interviews or tests. */
export default function CalendarView({ items, roles = [] }: { items: CalItem[]; roles?: { id: string; name: string }[] }) {
  const today = localDay(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
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

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const i of items) {
      const k = dayOf(i);
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    // Timed events first, in order; then all-day items.
    for (const list of m.values()) list.sort((a, b) => (a.at ?? "~").localeCompare(b.at ?? "~"));
    return m;
  }, [items]);

  const month = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const week = mondayOf(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  // Monday-first grid covering the whole month.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = Math.ceil((offset + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: days }, (_, i) => addDays(mondayOf(first), i));
  }, [cursor]);

  const upcoming = items
    .filter((i) => dayOf(i) >= today && (i.kind === "scheduled" || i.kind === "deadline"))
    .sort((a, b) => (a.at ?? `${a.day}T23:59`).localeCompare(b.at ?? `${b.day}T23:59`))
    .slice(0, 6);

  const monthName = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const inMonth = items.filter((i) => dayOf(i).startsWith(`${month.getFullYear()}-${pad(month.getMonth() + 1)}`));
  const count = (k: CalItem["kind"]) => inMonth.filter((i) => i.kind === k).length;
  const weekEnd = weekDays[6];
  const weekName =
    week.getMonth() === weekEnd.getMonth()
      ? `${week.getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString("en-GB", { month: "long" })}`
      : `${week.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  const shift = (n: number) => setCursor((c) => (view === "month" ? new Date(c.getFullYear(), c.getMonth() + n, 1) : addDays(c, 7 * n)));
  const unit = view === "month" ? "month" : "week";

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
              ＋ to add an event, or click any entry for its details and the role.
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
        <section className="tile span-8 min-w-0" aria-labelledby="cal-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cal-h" className="text-[24px] tracking-tight" aria-live="polite">
              {view === "month" ? (
                <>
                  <b>{monthName.split(" ")[0]}</b> <span className="font-light">{monthName.split(" ")[1]}</span>
                </>
              ) : (
                <>
                  <b>Week</b> <span className="font-light">{weekName}</span>
                </>
              )}
            </h2>
            <span className="flex flex-wrap gap-1.5">
              <span className="flex rounded-[12px] bg-white p-0.5" role="group" aria-label="View">
                {(["week", "month"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    className="rounded-[10px] px-3 py-1.5 text-[13px] font-bold capitalize aria-pressed:bg-[var(--lilac)]"
                    onClick={() => setView(v)}
                  >
                    {v}
                  </button>
                ))}
              </span>
              <button type="button" className={ctl} aria-label={`Previous ${unit}`} onClick={() => shift(-1)}>
                ←
              </button>
              <button type="button" className={ctl} onClick={() => setCursor(new Date())}>
                Today
              </button>
              <button type="button" className={ctl} aria-label={`Next ${unit}`} onClick={() => shift(1)}>
                →
              </button>
              <button type="button" className={`${ctl} !bg-[var(--black)] !text-[var(--onblack)]`} onClick={() => add()}>
                ＋ Add event
              </button>
            </span>
          </div>

          {view === "week" ? (
            // Week: seven columns on laptops, a day-by-day list on phones.
            <div className="mt-4 grid gap-1.5 md:grid-cols-[repeat(7,minmax(0,1fr))]" aria-label={`Week of ${weekName}`}>
              {weekDays.map((d) => {
                const key = localDay(d);
                const list = byDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={`group grid min-w-0 content-start gap-1.5 rounded-[12px] bg-white p-2 md:min-h-[300px] ${key === today ? "ring-2 ring-[var(--ink)]" : ""}`}
                  >
                    <p className="flex items-center justify-between gap-1">
                      <span className="text-[12px] text-[var(--ink2)]">
                        {WEEKDAYS[(d.getDay() + 6) % 7]} <b className="text-[15px] text-[var(--ink)]">{d.getDate()}</b>
                      </span>
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded-full text-[13px] leading-none text-[var(--ink2)] hover:bg-[var(--sky)] md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-visible:opacity-100"
                        aria-label={`Add an event on ${dayName(d)}`}
                        onClick={() => add(d)}
                      >
                        ＋
                      </button>
                    </p>
                    {list.map((i, n) => (
                      <Entry key={n} i={i} big onOpen={setOpen} />
                    ))}
                    {list.length === 0 && <span className="text-[12px] text-[var(--mute)] md:hidden">Nothing planned</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Month grid (laptops and tablets) */}
              <div className="mt-4 grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1.5 max-md:hidden" role="grid" aria-label={monthName}>
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
                          aria-label={`Add an event on ${dayName(d)}`}
                          onClick={() => add(d)}
                        >
                          ＋
                        </button>
                      </p>
                      <ul className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
                        {list.slice(0, 3).map((i, n) => (
                          <li key={n} className="min-w-0">
                            <Entry i={i} onOpen={setOpen} />
                          </li>
                        ))}
                        {list.length > 3 && (
                          <li>
                            <button
                              type="button"
                              className="px-1 text-[11px] text-[var(--mute)] hover:text-[var(--ink)]"
                              onClick={() => {
                                setCursor(d);
                                setView("week");
                              }}
                            >
                              +{list.length - 3} more
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {/* Phones: the month as a list */}
              <ul className="mt-4 grid gap-1.5 md:hidden">
                {[...inMonth]
                  .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
                  .map((i, n) => (
                    <li key={n}>
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-center gap-2 rounded-[10px] bg-white px-2.5 py-2 text-left text-[13px]"
                        onClick={() => setOpen(i)}
                      >
                        <span className="w-[50px] flex-none text-[var(--ink2)]">
                          {new Date(i.at ?? `${i.day}T12:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                        <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] ${KIND[i.kind].tone}`}>{itemLabel(i)}</span>
                        <span className="min-w-0 truncate font-bold">{i.company}</span>
                      </button>
                    </li>
                  ))}
                {inMonth.length === 0 && <li className="text-[13px] text-[var(--ink2)]">Nothing this month.</li>}
              </ul>
            </>
          )}

          <ul className="mt-4 flex flex-wrap gap-2 text-[12px]" aria-label="Legend">
            {(Object.keys(KIND) as CalItem["kind"][]).map((k) => (
              <li key={k} className={`rounded-full px-2.5 py-1 ${KIND[k].tone}`}>
                {KIND[k].label}
              </li>
            ))}
          </ul>
        </section>

        {/* Coming up */}
        <section className="tile tile-sky span-4 grid min-w-0 content-start gap-3" aria-labelledby="next-h">
          <h2 id="next-h" className="text-[20px] tracking-tight">
            <b>Coming up</b> <span className="font-light">next</span>
          </h2>
          {upcoming.length === 0 && <p className="text-[14px] text-[var(--ink2)]">Nothing scheduled. Press ＋ to add an interview or assessment.</p>}
          <ul className="grid gap-2">
            {upcoming.map((i, n) => (
              <li key={n}>
                <button
                  type="button"
                  className="grid w-full min-w-0 gap-1.5 rounded-2xl bg-white p-3 text-left transition-shadow hover:shadow-md"
                  onClick={() => setOpen(i)}
                >
                  <span className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className={`rounded-full px-2 py-0.5 font-bold ${KIND[i.kind].tone}`}>{itemLabel(i)}</span>
                    <span className="text-[var(--ink2)]">
                      {new Date(i.at ?? `${i.day}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {i.at && `, ${timeOf(i)}`}
                    </span>
                  </span>
                  <span className="text-[15px] leading-snug">
                    <b>{i.company}</b> {i.role && <span className="font-light">{titleCase(i.role)}</span>}
                  </span>
                  {i.location && <span className="text-[12.5px] text-[var(--ink2)]">{i.location}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <EventDialog draft={draft} roles={roles} taken={taken} onClose={() => setDraft(null)} />
      <EventDetails item={open} onClose={() => setOpen(null)} onEdit={edit} />
    </main>
  );
}
