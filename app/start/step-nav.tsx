import Link from "next/link";

/** The wide heading of a step, with an optional lead line under it. */
export function StepHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex max-w-measure flex-col gap-2">
      <h1 className="wide text-display font-semibold tracking-[-0.01em] text-ink">{title}</h1>
      {children && <p className="text-lead text-ink-soft">{children}</p>}
    </div>
  );
}

/** The way back one step. It always keeps the answers, because they are in the link. */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="text-body font-medium text-ink underline decoration-1 hover:decoration-2">
      {children}
    </Link>
  );
}
