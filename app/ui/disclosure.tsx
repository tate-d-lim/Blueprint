/** A row that opens to show more, built on <details>. Used for every collapsible list in the app. */
export function Disclosure({
  summary,
  aside,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-rule last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-1 py-3 hover:bg-blueprint-wash/50 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0 text-blueprint transition-transform group-open:rotate-90">
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
        <span className="min-w-0 flex-1">{summary}</span>
        {aside}
      </summary>
      <div className="pb-4 pl-7">{children}</div>
    </details>
  );
}
