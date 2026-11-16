"use client";

import { Button } from "@/app/ui/button";
import { useProject } from "./project-context";

/** The mark of a step: a numeral in a box, or a check when the step is done. The next step has an ink box. */
function Mark({ n, done, current }: { n: number; done: boolean; current: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`tnum inline-flex size-5 shrink-0 items-center justify-center rounded-sm border text-small font-semibold ${
        done ? "border-done bg-done-wash text-done" : current ? "border-ink bg-ink text-paper" : "border-rule-strong text-ink-soft"
      }`}
    >
      {done ? (
        <svg viewBox="0 0 12 12" className="size-3">
          <path d="M2 6.5l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

/**
 * The three first steps of a saved project: pick tools, give the plan to the agent, tick controls. One row under the
 * progress line. It goes away when all three are done or when the builder hides it.
 */
export function NextStrip() {
  const { toolIds, next, overlay, setToolsOpen, setHandoffOpen, setNoTools, hideNext } = useProject();
  const done = [
    toolIds.length > 0 || next.noTools === true,
    Boolean(next.handedOffAt),
    Object.values(overlay.taskStatus).some(s => s.status === "done"),
  ];
  if (next.hidden || done.every(Boolean)) return null;
  const current = done.indexOf(false);

  const step = (i: number, label: string, action?: () => void) => {
    const isDone = done[i];
    const isCurrent = i === current;
    const text = (
      <>
        <Mark n={i + 1} done={isDone} current={isCurrent} />
        <span className={isDone ? "text-ink-soft" : isCurrent ? "font-semibold text-ink" : "text-ink-soft"}>{label}</span>
        {isDone && <span className="sr-only"> (done)</span>}
      </>
    );
    return (
      <li key={i} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2 text-small">
        {action ? (
          <button type="button" onClick={action} className="inline-flex cursor-pointer items-center gap-2 underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-ink">
            {text}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2">{text}</span>
        )}
      </li>
    );
  };

  return (
    <section aria-label="Next" className="mt-2 flex h-11 items-center gap-x-6 border-t border-rule">
      <h2 className="text-small font-semibold">Next</h2>
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6">
        {step(0, "Pick your tools", () => setToolsOpen(true))}
        {step(1, "Give the plan to your agent", () => setHandoffOpen(true))}
        {step(2, "Tick each control when it is done")}
      </ol>
      <div className="flex shrink-0 items-center gap-1">
        {!done[0] && (
          <>
            <Button variant="quiet" size="sm" onClick={() => setNoTools(true)}>
              Your app uses no tools
            </Button>
            <span aria-hidden="true" className="h-4 w-px bg-rule-strong" />
          </>
        )}
        <Button variant="quiet" size="sm" onClick={hideNext}>
          Hide
        </Button>
      </div>
    </section>
  );
}
