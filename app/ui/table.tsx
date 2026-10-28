import Link from "next/link";

/** A drawing schedule: ruled rows, headings in the lettering face, numbers in tabular figures. */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xs border border-rule bg-paper">
      <table className="w-full border-collapse text-left text-body">
        <thead>
          <tr className="border-b border-ink">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-2.5 align-bottom font-display text-small font-semibold text-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-rule [&>tr:last-child]:border-b-0">{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ children, nowrap = false, className = "" }: { children: React.ReactNode; nowrap?: boolean; className?: string }) {
  return <td className={`px-4 py-3 align-top ${nowrap ? "whitespace-nowrap" : ""} ${className}`}>{children}</td>;
}

/** A "Back to …" trail above a sheet's heading. */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-small text-ink-soft">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="font-medium text-blueprint underline decoration-1 hover:decoration-2">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
