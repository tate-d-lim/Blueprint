/**
 * A ruled panel on the drawing sheet: white paper, one 1px rule, square corners. The optional title sits in a
 * ruled strip like a detail box on a drawing, always as an h2 at the panel-title size. With `scroll`, the title
 * strip stays put and only the body scrolls, so the ruled box always closes.
 */
export function Panel({
  title,
  description,
  aside,
  scroll = false,
  children,
  as: Tag = "section",
  className = "",
}: {
  title?: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  scroll?: boolean;
  children: React.ReactNode;
  as?: "section" | "div" | "li" | "article";
  className?: string;
}) {
  return (
    <Tag className={`rounded-xs border border-rule bg-paper ${scroll ? "flex min-h-0 flex-col" : ""} ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-title font-semibold text-ink">{title}</h2>
            {description && <p className="text-small text-ink-soft">{description}</p>}
          </div>
          {aside}
        </div>
      )}
      <div className={`px-5 py-4 ${scroll ? "min-h-0 overflow-y-auto" : ""}`}>{children}</div>
    </Tag>
  );
}

/** The heading and one-line description at the top of a sheet. */
export function PageHeader({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex max-w-measure flex-col gap-1.5">
        <h1 className="text-display font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        {children && <p className="text-lead text-ink-soft">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/** A section heading with its count, used for the four plan headings and similar lists. */
export function SectionHeading({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <h2 className="text-heading leading-tight font-semibold text-ink">{title}</h2>
        {count !== undefined && <span className="tnum font-display text-title font-semibold text-blueprint">{count}</span>}
      </div>
      {children && <p className="max-w-measure text-body text-ink-soft">{children}</p>}
    </div>
  );
}
