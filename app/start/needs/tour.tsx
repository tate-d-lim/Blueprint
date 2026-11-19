"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/ui/button";

export const TOUR_STEPS = 4;

/**
 * Where each tooltip sits on the stage. The top-centre spot is the middle of the space between the label columns: half
 * of the card inset (392px) plus the label columns, which cancel out.
 */
const PLACES = ["top-centre", "top-centre", "bottom-right", "top-centre"] as const;

/**
 * Step 4's introduction: one tooltip at a time, over the hotel. It does not block the page, so a click on a part ends
 * it and opens that part.
 */
export function TourTip({
  step,
  networkCount,
  onBack,
  onNext,
  onSkip,
  takeFocus,
}: {
  /** 0 to 3. */
  step: number;
  /** How many Network controls the app has, for step 3. */
  networkCount: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  /** False on the first step at page load, so the page does not steal the focus before the reader acts. */
  takeFocus: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (takeFocus) ref.current?.focus({ preventScroll: true });
  }, [step, takeFocus]);

  const last = step === TOUR_STEPS - 1;
  const { title, body } = COPY[step](networkCount);
  const place = PLACES[step] === "top-centre" ? { top: 32, left: "calc(50% + 196px)", transform: "translateX(-50%)" } : { right: 32, bottom: 32 };

  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="tour-title"
      data-tour-step={step + 1}
      style={place}
      className="absolute z-10 w-[360px] rounded-sm border border-ink bg-paper shadow-[0_10px_28px_-10px_rgb(28_43_58/0.45)] outline-none"
    >
      <div key={step} className="story-in flex flex-col gap-3 px-5 pt-5 pb-4">
        <h2 id="tour-title" className="wide text-lead leading-snug font-semibold">
          {title}
        </h2>
        <div className="flex flex-col gap-2 text-body">{body}</div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-rule px-5 py-3">
        <p className="tnum text-small text-ink-soft">
          Step {step + 1} of {TOUR_STEPS}
        </p>
        <div className="flex items-center gap-2">
          {!last && (
            <Button variant="quiet" size="sm" onClick={onSkip}>
              Skip the tour
            </Button>
          )}
          {step > 0 && (
            <Button variant="secondary" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {last ? "Explore the hotel" : "Next"}
          </Button>
        </div>
      </div>
    </section>
  );
}

const COPY: ((network: number) => { title: string; body: React.ReactNode })[] = [
  () => ({
    title: "Your security plan",
    body: (
      <p>
        Based on your answers previously, here is your System Security Plan (SSP). It contains all the security controls that are recommended
        for your type of application, based on IM8, the Singapore Government&rsquo;s Instruction Manual for ICT and Smart Systems.
      </p>
    ),
  }),
  () => ({
    title: "Categories of controls",
    body: (
      <p>
        The security plan has several categories of controls, ranging from controls relating to Application Infrastructure, to controls
        regarding Access within your application. To learn about what each category is about, look at the hotel. Each category is one part
        of it: the foundation is your infrastructure, and the room keycards are access.
      </p>
    ),
  }),
  network => ({
    title: "Network · Entrance security",
    body: (
      <p>
        The Network controls are the hotel's entrance security: what can reach your app from the network, and what is stopped at the door.{" "}
        {network === 0 ? "None of them apply to your app." : `Your app has ${network} of them.`}
      </p>
    ),
  }),
  () => ({
    title: "Your turn",
    body: (
      <p>
        Click on each part of the hotel to learn more about that set of controls. When you are ready, save this plan.
      </p>
    ),
  }),
];
