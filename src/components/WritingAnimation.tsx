"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading the role…",
  "Picking your strongest facts…",
  "Tailoring your CV…",
  "Writing your Cover Letter…",
  "Checking it fits on one page…",
];

/** Shown while the CV and letter are being written: lines draw onto a page, with a moving pen. */
export default function WritingAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="writing tile tile-lilac flex flex-wrap items-center gap-6" role="status" aria-live="polite">
      <div className="writing-page" aria-hidden="true">
        <span className="writing-title" />
        {[92, 100, 84, 96, 70, 88, 60].map((w, i) => (
          <span key={i} className="writing-line" style={{ width: `${w}%`, animationDelay: `${i * 0.55}s` }} />
        ))}
        <span className="writing-pen">✎</span>
      </div>
      <div>
        <p className="text-[20px] font-bold tracking-tight">Writing your application</p>
        <p className="mt-1 text-[15px] text-[var(--ink2)]">{STEPS[step]}</p>
        <p className="mt-3 text-[12.5px] text-[var(--mute)]">Usually 10 to 30 seconds. You can stay on this page.</p>
      </div>
    </div>
  );
}
