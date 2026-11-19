"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Hotel } from "@/app/hotel/hotel";
import { Button } from "@/app/ui/button";
import { Disclosure } from "@/app/ui/disclosure";
import { PARTS, countsAs, partOf, type PartId, type PartState } from "@/lib/plan/hotel";
import { resolveParameters } from "@/lib/plan/format";
import type { PlanItem } from "@/lib/plan/engine";
import { taskStatusOf } from "@/lib/plan/progress";
import { itemVerification } from "@/lib/plan/verification";
import { Badge } from "./badge";
import { useProject } from "./project-context";

/** The card's width, and the pixels it covers at the left of the stage (its margin, itself and a gap). */
const CARD_WIDTH = 368;
const CARD_INSET = 16 + CARD_WIDTH + 8;

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** The state of one control, in words: who did it, or that it is still to do. */
function stateOf(item: PlanItem): { done: boolean; text: string } {
  const as = countsAs(item);
  if (as === "platform") return { done: true, text: `Done by ${item.decisive.map(c => c.toolName).filter((n, i, all) => all.indexOf(n) === i).join(", ") || "your tools"}` };
  if (as === "you") return taskStatusOf(item) === "done" ? { done: true, text: "Done" } : { done: false, text: "Not done" };
  return { done: false, text: "Needs a decision" };
}

/**
 * The second tab of a saved project: the whole hotel at full width. A click on a part moves the camera in on it, and a
 * card on the left reads the controls of that part, with their official wording. It is for reading: the checklist is
 * where controls are ticked. The picked part is in the address (?part=), so a link opens on it.
 */
export function HotelTab({ initialPart }: { initialPart: string | null }) {
  const { project, plan, parts, entries, totals } = useProject();
  const known = (id: string | null): PartId | null => (parts.some(p => p.id === id) ? (id as PartId) : null);
  const [focus, setFocusState] = useState<PartId | null>(known(initialPart));
  const [hovered, setHovered] = useState<PartId | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cameFrom = useRef<PartId | null>(null);

  const setFocus = (id: PartId | null) => {
    setFocusState(id);
    window.history.replaceState(null, "", id ? `?part=${id}` : window.location.pathname);
  };
  const open = (id: PartId) => {
    setHovered(null);
    setFocus(id);
  };
  const close = () => {
    cameFrom.current = focus;
    setFocus(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && focus && close();
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

  const rows = useMemo(() => {
    if (!focus) return [];
    return plan.items
      .filter(i => partOf(i.family) === focus && countsAs(i) !== null)
      // What is left comes first.
      .sort((a, b) => Number(stateOf(a).done) - Number(stateOf(b).done) || natural(a.id, b.id));
  }, [plan, focus]);

  return (
    <div className="relative flex h-full min-h-0 flex-col p-4">
      <Hotel
        parts={parts}
        selected={focus ?? hovered}
        onSelect={id => !focus && setHovered(id)}
        interactive={!focus}
        onPick={open}
        view={{ inset: CARD_INSET, focus }}
      />

      <div data-card style={{ width: CARD_WIDTH }} className="absolute top-8 bottom-8 left-8 flex flex-col rounded-sm border border-rule-strong bg-paper">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {part && state ? (
            <div key={part.id} className="story-in flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <Button variant="quiet" size="sm" onClick={close}>
                  <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 2L4 6l4 4" />
                  </svg>
                  Whole hotel
                </Button>
                <p className="tnum text-small text-ink-soft">
                  Part {index + 1} of {parts.length}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <h2 ref={headingRef} tabIndex={-1} className="wide text-title font-semibold outline-none">
                  {state.families.join(", ")}
                </h2>
                <p className="text-body text-ink-soft">{part.name}</p>
              </div>
              <p className="max-w-measure text-lead">{part.summary}</p>
              <p className="tnum border-y border-rule py-3 text-body font-semibold">
                {state.nothingForApp ? "Nothing in this part applies to your app." : state.line2}
              </p>

              {rows.length > 0 && (
                <ul className="flex flex-col">
                  {rows.map(item => {
                    const s = stateOf(item);
                    const official = resolveParameters(entries.get(item.key)?.statement ?? item.rationale);
                    const verification = itemVerification(item);
                    return (
                      <li key={item.key} className="flex flex-col gap-1.5 border-b border-rule py-3 last:border-b-0">
                        <p className="flex items-start gap-2 text-body font-semibold">
                          <span
                            aria-hidden="true"
                            className={`mt-[5px] flex size-4 shrink-0 items-center justify-center rounded-sm border ${s.done ? "border-done bg-done text-paper" : "border-rule-strong bg-paper"}`}
                          >
                            {s.done && (
                              <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                              </svg>
                            )}
                          </span>
                          <span>{item.plain?.title ?? item.title}</span>
                        </p>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-small text-ink-soft">
                          <span>{s.text}</span>
                          {s.done && countsAs(item) === "platform" && verification && verification !== "verified" && <Badge verification={verification} />}
                        </p>
                        {(item.plain?.task ?? item.plain?.question) && !s.done && (
                          <p className="max-w-measure pl-6 text-body">{item.plain?.task ?? item.plain?.question}</p>
                        )}
                        <div className="pl-6">
                          <Disclosure summary={<span className="text-small font-medium">Official wording</span>}>
                            <p data-official className="max-w-measure text-small text-ink-soft">
                              <span className="font-code">{item.id}</span> {official}
                            </p>
                          </Disclosure>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

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
              <h2 className="wide text-title leading-tight font-semibold">Explore your hotel</h2>
              <p className="flex items-start gap-2 text-body font-semibold">
                Click on a part of the hotel to read its controls.
                <svg aria-hidden="true" viewBox="0 0 24 12" className="nudge-right mt-1.5 h-3 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M1 6h21M17 1l5 5-5 5" />
                </svg>
              </p>
              <p className="tnum text-body">
                {totals.done} of {totals.total} done. Your tools did {totals.platform}.
              </p>
              <p className="text-small text-ink-soft">The hotel fills in as controls are done. To tick a control, use the checklist.</p>
              <Link href={`/projects/${project._id}`} className="w-fit text-body font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
                Go to the checklist
              </Link>
            </div>
          )}
        </div>
        {part && (
          <div className="border-t border-rule px-6 py-4">
            <Link href={`/projects/${project._id}`} className="text-body font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
              Tick controls in the checklist
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
