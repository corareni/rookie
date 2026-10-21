"use client";

import Dialog from "@/components/Dialog";
import { STATUSES, formatDate, type Status } from "@/lib/applications";
import { eventLabel } from "@/lib/calendar";

type StageDates = { submitted_on: string | null; assessment_on: string | null; interview_on: string | null; offer_on: string | null };

export type StatusChange = {
  name: string;
  from: Status;
  to: Status;
  /** The scheduled interview or assessment, if there is one. */
  eventAt: string | null;
  eventKind: "interview" | "assessment" | "other" | null;
  /** The stage dates shown on the calendar. */
  dates: StageDates;
};

/** Event columns cleared when the date is removed together with a status change. */
export const NO_EVENT = { event_at: null, event_location: null, event_kind: null };

const ORDER: Status[] = ["interested", "submitted", "assessment", "interview", "offer"];
const DATE_OF: Record<string, { key: keyof StageDates; label: string }> = {
  submitted: { key: "submitted_on", label: "Applied" },
  assessment: { key: "assessment_on", label: "Assessment stage" },
  interview: { key: "interview_on", label: "Interview stage" },
  offer: { key: "offer_on", label: "Offer" },
};

/**
 * Moving a role back (e.g. Interview → Submitted) clears the dates of the stages it no longer reached,
 * so they disappear from the calendar. Rejected and withdrawn keep the history.
 */
export function clearedDates(to: Status, dates: StageDates): Partial<StageDates> {
  const at = ORDER.indexOf(to);
  if (at < 0) return {};
  return Object.fromEntries(
    ORDER.slice(at + 1)
      .map((s) => DATE_OF[s].key)
      .filter((k) => dates[k])
      .map((k) => [k, null]),
  );
}

const label = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;
const inStage = (s: Status) => s === "interview" || s === "assessment";

/**
 * Asks before a status change and says what leaves the calendar: dates of stages the role no longer
 * reached, and (when leaving the interview or assessment stage) the scheduled date.
 */
export default function StatusConfirm({
  change,
  onCancel,
  onConfirm,
}: {
  change: StatusChange | null;
  onCancel: () => void;
  onConfirm: (removeEvent: boolean) => void;
}) {
  const offerRemove = !!change?.eventAt && !inStage(change.to);
  const what = change?.eventKind === "assessment" ? "assessment" : change?.eventKind === "other" ? "next step" : "interview";
  const gone = change
    ? Object.keys(clearedDates(change.to, change.dates)).map((k) => {
        const stage = Object.values(DATE_OF).find((d) => d.key === k)!;
        return `${stage.label} (${formatDate(change.dates[k as keyof StageDates]!)})`;
      })
    : [];
  return (
    <Dialog
      open={!!change}
      title={change ? `Move ${change.name} to ${label(change.to)}?` : ""}
      onCancel={onCancel}
      actions={
        offerRemove
          ? [
              { label: "Cancel", tone: "ghost", onClick: onCancel },
              { label: `Keep the ${what}`, tone: "ghost", onClick: () => onConfirm(false) },
              { label: "Change status", onClick: () => onConfirm(true) },
            ]
          : [
              { label: "Cancel", tone: "ghost", onClick: onCancel },
              { label: "Change status", onClick: () => onConfirm(false) },
            ]
      }
    >
      {change && (
        <>
          <p>
            The status changes from <b>{label(change.from)}</b> to <b>{label(change.to)}</b>.
          </p>
          {(gone.length > 0 || offerRemove) && (
            <div className="mt-2">
              <p>This also comes off your calendar:</p>
              <ul className="mt-1 list-disc pl-5">
                {offerRemove && (
                  <li>
                    The scheduled {what} on <b>{eventLabel(change.eventAt!)}</b>
                  </li>
                )}
                {gone.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              {offerRemove && (
                <p className="mt-2 text-[13px]">
                  If you added the {what} to Google or Apple Calendar, delete it there as well. To keep it, choose
                  &quot;Keep the {what}&quot;.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
