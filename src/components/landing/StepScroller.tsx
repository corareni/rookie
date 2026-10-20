"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, SCREENS } from "@/components/landing/Screens";

const STEPS = [
  {
    t: "Find",
    k: "a role.",
    d: "Paste any job link: a company careers page, Greenhouse, Lever, Workday and more. Rookie reads the listing and fills in company, role, location, timing and deadline. If a site blocks reading, paste the description instead.",
  },
  {
    t: "Decide",
    k: "if it's worth it.",
    d: "Every role gets an honest score out of 10 based on your profile: what the company does, why you fit and the catch. Roles that clash with your own barriers wait in review, so your board stays focused.",
  },
  {
    t: "Apply",
    k: "with a tailored CV.",
    d: "One click writes a CV and cover letter for that company, using only facts from your own profile. Edit them, then download clean one-page PDFs.",
  },
  {
    t: "Prepare",
    k: "for the assessment.",
    d: "Mark a role as applied and it moves to your applications, with online tests, case studies, deadlines and next steps next to each one.",
  },
  {
    t: "Interview",
    k: "with clarity.",
    d: "Comparing offers or interviews? Put two to four roles side by side: the best pick for you, pros, cons and how you fit each one.",
  },
  {
    t: "Start",
    k: "the right job.",
    d: "Follow every application from interested to offer on one board. No spreadsheets, no lost tabs, no missed deadlines.",
  },
];

const TONES = ["tile-lilac", "tile-mint", "tile-peach", "tile-sky", "tile-butter", "tile-lilac"];

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
    <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_340px]">
      <ol className="grid gap-[var(--gap)] lg:gap-0">
        {STEPS.map((s, i) => {
          const Screen = SCREENS[i];
          const on = i === active;
          const tilt = i % 2 ? "lg:rotate-[1.5deg]" : "lg:-rotate-[1.5deg]";
          return (
            <li
              key={s.t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className="flex lg:min-h-[72vh] lg:items-center"
            >
              <div
                className={`step-card tile ${TONES[i]} w-full ${on ? "" : `lg:translate-y-6 lg:opacity-40 ${tilt}`}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="chip-tag !bg-white">Step {String(i + 1).padStart(2, "0")}</span>
                  <span className="arrow-btn !h-11 !w-11 !text-[18px]" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <h3 className="mt-6 text-[clamp(30px,4.4vw,52px)] leading-none tracking-[-0.03em]">
                  {s.t} <span className="font-light">{s.k}</span>
                </h3>
                <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-[var(--ink2)]">{s.d}</p>
                <div className="mt-8 lg:hidden">
                  <Phone label={`Example screen: ${s.t}`}>
                    <Screen />
                  </Phone>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="hidden lg:block">
        <div className="tile sticky top-[10vh] grid place-items-center !py-10">
          {SCREENS.map((Screen, i) => (
            <div
              key={i}
              aria-hidden={i !== active}
              className={`screen-fade [grid-area:1/1] transition-all duration-500 ${i === active ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
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
