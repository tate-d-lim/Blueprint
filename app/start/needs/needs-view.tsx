"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Hotel } from "@/app/hotel/hotel";
import { Button } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import type { FactAnswers } from "@/lib/domain/types";
import { PARTS, type PartId, type PartState } from "@/lib/plan/hotel";
import type { DetailRow } from "@/lib/plan/needs";
import { useUnsavedGuard } from "@/lib/plan/unsaved";
import type { RiskAnswers } from "@/lib/risk/assess";
import { StepBar } from "../step-nav";
import { PartDetails } from "./part-details";
import { SaveBar } from "./save-bar";
import { TOUR_STEPS, TourTip } from "./tour";

export interface NeedsViewProps {
  profileTitle: string;
  line: string;
  coverageLine: string | null;
  parts: PartState[];
  details: Record<PartId, DetailRow[]>;
  skipped: { id: string; title: string; reason: string }[];
  /** The step link's query, for the way back. */
  query: string;
  answers: RiskAnswers;
  facts: FactAnswers;
  edit: { projectId: string; projectName: string; dirty: boolean; typeChange: string | null } | null;
}

/** The card's width, and the pixels it covers at the left of the stage (its margin, itself and a gap). */
const CARD_WIDTH = 368;
const CARD_INSET = 16 + CARD_WIDTH + 8;

/**
 * Step 4: the security plan, drawn as the hotel with no tools. The hotel has the full width; a card on its left first
 * holds the heading, the save and the way back into the tour. A new plan opens with a 4-step tour in tooltips. A click
 * on a part moves the camera in on it, and the card explains that set of controls.
 */
export function NeedsView({ profileTitle, line, coverageLine, parts, details, skipped, query, answers, facts, edit }: NeedsViewProps) {
  // `hovered` only fades the other parts; `focus` is the part the camera is close in on, with its card.
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [focus, setFocus] = useState<PartId | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameFrom = useRef<PartId | null>(null);
  // The tour step (0 to 3), or null when it is not on. It starts by itself on a new plan, not on a saved one.
  const [tour, setTour] = useState<number | null>(edit ? null : 0);
  // The first tooltip does not take the focus at page load; every later one does.
  const [tourMoved, setTourMoved] = useState(false);
  const cardHeadingRef = useRef<HTMLHeadingElement>(null);
  useUnsavedGuard(edit?.dirty ?? false);

  const open = (id: PartId) => {
    setTour(null);
    setHovered(null);
    setFocus(id);
  };
  const close = () => {
    cameFrom.current = focus;
    setFocus(null);
  };
  const tourTo = (step: number | null) => {
    setTourMoved(true);
    setTour(step);
    if (step === null) cardHeadingRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (tour !== null ? tourTo(null) : close());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The keyboard follows the card: to the part's name when one opens, and back to its label when it closes.
  useEffect(() => {
    if (focus) {
      headingRef.current?.focus({ preventScroll: true });
      return;
    }
    const from = cameFrom.current;
    cameFrom.current = null;
    if (from) (document.querySelector(`[data-label="${from}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
  }, [focus]);

  const index = parts.findIndex(p => p.id === focus);
  const part = PARTS.find(p => p.id === focus);
  const state = parts[index];
  const prev = index > 0 ? parts[index - 1] : null;
  const next = index >= 0 && index < parts.length - 1 ? parts[index + 1] : null;
  const nameOf = (s: PartState) => PARTS.find(p => p.id === s.id)!.name;
  const network = parts.find(p => p.id === "entrance");

  return (
    <div style={{ height: "calc(100dvh - var(--header-h))" }} className="-mx-8 -mt-8 -mb-16 flex flex-col overflow-hidden">
      <div className="border-b border-rule bg-paper px-8 py-3">
        {edit ? (
          // A saved project has finished its setup, so no steps: the way back to the project, and the answers to change.
          <div className="flex items-center justify-between gap-6">
            <Link
              href={`/projects/${edit.projectId}`}
              className="inline-flex items-center gap-1.5 text-body font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 2L4 6l4 4" />
              </svg>
              Back to project
            </Link>
            <p className="text-body font-semibold">{edit.projectName}</p>
            <Link href={`/start/app?${query}`} className="text-body font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
              Change answers
            </Link>
          </div>
        ) : (
          <StepBar step={4} back={`/start/app?${query}`} />
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col p-4">
        <Hotel
          parts={parts}
          selected={focus ?? (tour === 2 ? "entrance" : hovered)}
          onSelect={id => !focus && setHovered(id)}
          interactive={!focus}
          onPick={open}
          view={{ inset: CARD_INSET, focus: focus ?? (tour === 2 ? "entrance" : null) }}
          labels={tour === 0 ? "hidden" : tour === 1 ? "enter" : "shown"}
        />
        {tour !== null && (
          <TourTip
            step={tour}
            networkCount={network ? network.counts.you + network.counts.questions : 0}
            onBack={() => tourTo(tour - 1)}
            onNext={() => tourTo(tour + 1 < TOUR_STEPS ? tour + 1 : null)}
            onSkip={() => tourTo(null)}
            takeFocus={tourMoved}
          />
        )}

        <div data-card style={{ width: CARD_WIDTH }} className="absolute top-8 bottom-8 left-8 flex flex-col rounded-sm border border-rule-strong bg-paper">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {part && state ? (
              <div key={part.id} className="story-in flex flex-col gap-6">
                <div className="flex items-center justify-between gap-3">
                  <Button variant="quiet" size="sm" onClick={close}>
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M8 2L4 6l4 4" />
                    </svg>
                    Whole plan
                  </Button>
                  <p className="tnum text-small text-ink-soft">
                    Part {index + 1} of {parts.length}
                  </p>
                </div>
                <PartDetails part={part} state={state} rows={details[part.id]} headingRef={headingRef} />
                <div className="flex flex-wrap gap-3">
                  {prev && (
                    <Button variant="secondary" size="sm" onClick={() => setFocus(prev.id)}>
                      Previous: {nameOf(prev)}
                    </Button>
                  )}
                  {next && (
                    <Button variant="secondary" size="sm" onClick={() => setFocus(next.id)}>
                      Next: {nameOf(next)}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div key="intro" className="story-in flex flex-col gap-5">
                <h1 ref={cardHeadingRef} tabIndex={-1} className="wide text-title leading-tight font-semibold outline-none">
                  Here is your application&rsquo;s security plan
                </h1>
                <p className="-mt-2 flex items-start gap-2 text-body font-semibold">
                  Click on each part of the hotel to learn more about that set of controls.
                  <svg aria-hidden="true" viewBox="0 0 24 12" className="nudge-right mt-1.5 h-3 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M1 6h21M17 1l5 5-5 5" />
                  </svg>
                </p>
                <p className="text-body font-medium">{line}</p>
                {coverageLine && <p className="text-small text-ink-soft">{coverageLine}</p>}

                {edit?.typeChange && <p className="text-body font-medium">{edit.typeChange}</p>}
                {tour === null && (
                  <div>
                    <Button variant="quiet" size="sm" onClick={() => tourTo(0)}>
                      Show the tour again
                    </Button>
                  </div>
                )}
                {skipped.length > 0 && (
                  <div className="border-t border-rule">
                    <Disclosure summary={<span className="text-body font-semibold">Left out because of your answers ({skipped.length})</span>}>
                      <ul className="flex flex-col gap-3 pt-1">
                        {skipped.map(item => (
                          <li key={item.id} className="flex flex-col text-small">
                            <span>
                              <span className="font-code">{item.id}</span> {item.title}
                            </span>
                            <span className="text-ink-soft">{item.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </Disclosure>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-rule px-6 py-4">
            <SaveBar
              answers={answers}
              facts={facts}
              defaultName={`${profileTitle} app`}
              highlight={tour === TOUR_STEPS - 1}
              edit={edit ? { projectId: edit.projectId, projectName: edit.projectName } : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
