"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, SCREENS } from "@/components/landing/Screens";
import Arrow from "@/components/Arrow";

const STEPS = [
  {
    t: "Find",
    k: "a role.",
    d: "Paste any job link: a company careers page, Greenhouse, Lever, Workday and more. rookie reads the listing and fills in company, role, location, timing and deadline. If a site blocks reading, paste the description instead.",
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

/** Where card i sticks: each one a little lower, so the earlier ones peek out above it. */
const stickyTop = (i: number) => (typeof window === "undefined" ? 0 : window.innerHeight * 0.14) + i * 18;

const TONES = ["tile-lilac", "tile-mint", "tile-peach", "tile-sky", "tile-butter", "tile-lilac"];

export default function StepScroller() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  // Cards stack as you scroll (each sticks a little lower than the last). The active step is the last card
  // that has (nearly) reached its place; scrolling back up un-stacks them again.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let a = 0;
        refs.current.forEach((el, i) => {
          if (el && el.getBoundingClientRect().top <= stickyTop(i) + window.innerHeight * 0.18) a = i;
        });
        setActive(a);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_340px]">
      <ol className="grid gap-[var(--gap)] lg:block lg:pb-[20vh]">
        {STEPS.map((s, i) => {
          const Screen = SCREENS[i];
          const on = i === active;
          const past = i < active;
          return (
            <li
              key={s.t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className={`step-stack ${i < STEPS.length - 1 ? "lg:mb-[34vh]" : ""}`}
              style={{ ["--stack-top" as string]: `calc(14vh + ${i * 18}px)`, zIndex: i + 1 }}
            >
              <div
                className={`step-card tile ${TONES[i]} w-full ${on ? "lg:opacity-100" : past ? "lg:scale-[0.97] lg:opacity-40" : "lg:opacity-100"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="chip-tag !bg-white">Step {String(i + 1).padStart(2, "0")}</span>
                  <span className="arrow-btn !h-11 !w-11 !text-[18px]" aria-hidden="true">
                    <Arrow size="40%" />
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
        {/* No box around the phones: each new screen slides up and lands on top of the previous one. */}
        <div className="phone-float sticky top-[14vh] grid place-items-center py-10">
          {SCREENS.map((Screen, i) => (
            <div
              key={i}
              aria-hidden={i !== active}
              className="phone-stack [grid-area:1/1]"
              data-state={i === active ? "on" : i < active ? "under" : "next"}
              style={{ zIndex: i + 1 }}
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
