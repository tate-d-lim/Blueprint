/** The title and one-line description at the top of a screen. */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="sgds:flex sgds:flex-col sgds:gap-text-xs">
      <h1 className="sgds:text-heading-lg sgds:font-semibold">{title}</h1>
      {children && <p className="sgds:text-body-lg sgds:text-subtle">{children}</p>}
    </div>
  );
}
