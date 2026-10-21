"use client";

/** Restarts the onboarding tour (see Tour.tsx). */
export default function TourAgain() {
  return (
    <button type="button" className="btn btn-ghost !py-2.5" onClick={() => window.dispatchEvent(new Event("rk:tour"))}>
      Take the tour again
    </button>
  );
}
