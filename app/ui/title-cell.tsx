/**
 * One ruled cell of the title block: a small lettered field name over its value, on blueprint blue. Uppercase
 * lettering appears only in these cells.
 */
export function TitleCell({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col justify-between gap-1.5 px-5 py-3 ${className}`}>
      <span className="font-display text-label font-semibold tracking-[0.12em] text-paper/70 uppercase">{label}</span>
      <div>{children}</div>
    </div>
  );
}
