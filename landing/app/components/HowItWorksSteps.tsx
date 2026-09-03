"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    title: "Stick the tag on",
    body: "Peel and place it on your glass. Activate it once, and your number is hidden from then on.",
  },
  {
    title: "Someone scans it",
    body: "Blocked them in? Lights left on? They point a phone camera at the tag. No app, no sign-up.",
  },
  {
    title: "They call or message",
    body: "Everything routes through ParkTag, so neither side ever sees the other's number.",
  },
  {
    title: "You stay private",
    body: "You decide how to answer. Reachable when it matters, private the rest of the time.",
  },
];

const DWELL_MS = 2600;

export function HowItWorksSteps() {
  // Starts at 0 rather than nothing, so the server renders step one lit and
  // hydration has nothing to correct.
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Anyone who asked the OS for reduced motion gets no cycling: the effect
    // returns before starting the timer and the highlight stays on step one.
    // Deliberately no setState here — parking it on a different step would be
    // a synchronous set inside an effect, which cascades a second render on
    // every load for the people least well served by extra work.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setActive((i) => (i + 1) % STEPS.length),
      DWELL_MS
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <ol className="space-y-4">
      {STEPS.map(({ title, body }, i) => {
        const on = i === active;
        return (
          <li
            key={title}
            // Both states carry a border, transparent when dark. Without it the
            // card gains a border on the frame it lights up and every row below
            // shifts by two pixels, four times a cycle.
            className={`flex items-start gap-5 sm:gap-7 rounded-2xl border p-6 sm:p-7 transition-colors duration-500 ${
              on ? "bg-white border-white" : "bg-white/[0.04] border-white/10"
            }`}
            // The step being described, for anyone who cannot see which card is
            // lit. aria-current is the honest word for it: this is a highlight
            // moving through a list, not a selection the reader made.
            aria-current={on ? "step" : undefined}
          >
            <span className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2700] text-white font-extrabold text-xl">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="pt-1">
              <h3
                className={`font-bold text-lg mb-1.5 transition-colors duration-500 ${
                  on ? "text-[#03162D]" : "text-white"
                }`}
              >
                {title}
              </h3>
              <p
                className={`leading-relaxed transition-colors duration-500 ${
                  on ? "text-[#495B7B]" : "text-white/55"
                }`}
              >
                {body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
