import Link from "next/link";

/** The four steps of a new plan, in order. Short names, so all four fit on one line. */
const STEPS = ["Risk", "App type", "About your app", "What your app needs"] as const;

/**
 * The top of every step page: the way back one step, and where the builder is in the five steps. The current step is
 * marked for screen readers too.
 */
export function StepBar({ step, back, className = "" }: { step: 1 | 2 | 3 | 4; back: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-6 ${className}`}>
      <Link
        href={back}
        className="inline-flex items-center gap-1.5 text-body font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M8 2L4 6l4 4" />
        </svg>
        Back
      </Link>
      <nav aria-label="Steps">
        <ol className="tnum flex items-center gap-5 text-small">
          {STEPS.map((name, i) => {
            const n = i + 1;
            const current = n === step;
            return (
              <li
                key={name}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap ${
                  current ? "font-semibold text-ink underline decoration-2 underline-offset-[6px]" : n < step ? "text-ink" : "text-ink-soft"
                }`}
              >
                <span>{n}</span>
                <span>{name}</span>
                {current && <span className="sr-only">(step {n} of 4)</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

/** The wide heading of a step, with an optional lead line under it. */
export function StepHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex max-w-measure flex-col gap-2">
      <h1 className="wide text-display font-semibold tracking-[-0.01em] text-ink">{title}</h1>
      {children && <p className="text-lead text-ink-soft">{children}</p>}
    </div>
  );
}
