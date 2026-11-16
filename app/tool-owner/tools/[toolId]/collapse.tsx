"use client";

/** A ruled row that opens to show more. Like Disclosure, but the parent decides when it is open, so "Open all" and a jump to an error can work. */
export function Collapse({
  id,
  open,
  onToggle,
  summary,
  aside,
  nested = false,
  children,
}: {
  id?: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  summary: React.ReactNode;
  aside?: React.ReactNode;
  nested?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      onToggle={e => onToggle(e.currentTarget.open)}
      className="scroll-mt-4 border-b border-rule last:border-b-0"
    >
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-1 hover:bg-ground [&::-webkit-details-marker]:hidden ${nested ? "py-3" : "bg-ground py-3.5"}`}
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 shrink-0 text-ink transition-transform ${open ? "rotate-90" : ""}`}>
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
        <span className="min-w-0 flex-1">{summary}</span>
        {aside}
      </summary>
      {open && <div className={nested ? "pb-4 pl-7" : ""}>{children}</div>}
    </details>
  );
}
