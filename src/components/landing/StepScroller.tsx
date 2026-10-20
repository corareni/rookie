"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, SCREENS } from "@/components/landing/Screens";

const STEPS = [
  {
    t: "Find a role",
    d: "Paste any job link, from a company careers page, Greenhouse, Lever or Workday. Rookie reads the listing and fills in the company, role, location, timing and deadline. Blocked page? Paste the description instead.",
  },
  {
    t: "Be interested",
    d: "Every role gets an honest score out of 10 for you: what they do, why you fit and the catch. Roles that break your own rules, like visa or start date, are sorted out for you.",
  },
  {
    t: "Apply",
    d: "One click writes a CV and cover letter tailored to that company, using only facts from your real CV. Edit them, then download a one-page PDF.",
  },
  {
    t: "Assessment",
    d: "Mark a role as applied and it moves to your applications. Online tests, case studies and deadlines sit next to each one, with what's next.",
  },
  {
    t: "Interview",
    d: "Torn between offers or interviews? Compare 2 to 4 roles side by side: best pick, pros, cons and how you fit each one.",
  },
  {
    t: "Internship",
    d: "Track every role from interested to offer on one board. No spreadsheet, no lost tabs, no missed deadlines.",
  },
];

export default function StepScroller() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-16">
      <ol>
        {STEPS.map((s, i) => {
          const Screen = SCREENS[i];
          return (
            <li
              key={s.t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className={`step-text flex min-h-0 flex-col justify-center py-8 lg:min-h-[78vh] lg:py-0 ${i === active ? "opacity-100" : "lg:opacity-30"}`}
            >
              <p className="text-[13px] font-semibold text-[var(--mute)]">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-[clamp(32px,5vw,56px)] font-semibold uppercase leading-none tracking-[-0.03em]">{s.t}</h3>
              <p className="mt-4 max-w-[480px] text-[17px] leading-relaxed text-[var(--ink2)]">{s.d}</p>
              <div className="mt-8 lg:hidden">
                <Phone label={`Example screen: ${s.t}`}>
                  <Screen />
                </Phone>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-[12vh] grid">
          {SCREENS.map((Screen, i) => (
            <div
              key={i}
              aria-hidden={i !== active}
              className={`screen-fade [grid-area:1/1] transition-opacity duration-500 ${i === active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <Phone label={`Example screen: ${STEPS[i].t}`}>
                <Screen />
              </Phone>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
