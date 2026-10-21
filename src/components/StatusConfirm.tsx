"use client";

import Dialog from "@/components/Dialog";
import { STATUSES, type Status } from "@/lib/applications";
import { eventLabel } from "@/lib/calendar";

export type StatusChange = {
  name: string;
  from: Status;
  to: Status;
  /** The scheduled interview or assessment, if there is one. */
  eventAt: string | null;
  eventKind: "interview" | "assessment" | "other" | null;
};

/** Event columns cleared when the date is removed together with a status change. */
export const NO_EVENT = { event_at: null, event_location: null, event_kind: null };

const label = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;
const inStage = (s: Status) => s === "interview" || s === "assessment";

/** Asks before a status change; when leaving the interview or assessment stage, also offers to remove the date. */
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
  const what = change?.eventKind === "assessment" ? "an assessment" : change?.eventKind === "other" ? "a next step" : "an interview";
  return (
    <Dialog
      open={!!change}
      title={change ? `Move ${change.name} to ${label(change.to)}?` : ""}
      onCancel={onCancel}
      actions={
        offerRemove
          ? [
              { label: "Cancel", tone: "ghost", onClick: onCancel },
              { label: "Keep the date", tone: "ghost", onClick: () => onConfirm(false) },
              { label: "Change and remove date", onClick: () => onConfirm(true) },
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
          {offerRemove && (
            <p className="mt-2">
              You have {what} on <b>{eventLabel(change.eventAt!)}</b>. Remove it from your Rookie calendar too? If you
              added it to Google or Apple Calendar, delete it there as well.
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}
