import Link from "next/link";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold tracking-[0.01em] whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "border border-rule-strong bg-paper text-ink hover:border-ink hover:bg-ground",
  quiet: "text-ink underline-offset-4 hover:underline",
};
const SIZES: Record<Size, string> = {
  md: "h-10 px-4 text-body",
  sm: "h-8 px-3 text-small",
};

/** One class list for every button-like control, so buttons and button-styled links always match. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", pressed = false) {
  const quietSize = variant === "quiet" ? (size === "sm" ? "h-8 text-small" : "h-10 text-body") : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${quietSize} ${pressed ? "bg-ground! border-ink! text-ink!" : ""}`;
}

export function Button({
  variant = "primary",
  size = "md",
  pressed,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; pressed?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`${buttonClass(variant, size, pressed)} ${className}`}
      {...props}
    />
  );
}

/** A link that looks like a button: moves between pages without a reload. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size)}>
      {children}
    </Link>
  );
}

/** A file download that looks like a button. Plain anchor, because Next links don't download. */
export function DownloadButton({ href, variant = "primary", children }: { href: string; variant?: Variant; children: React.ReactNode }) {
  return (
    <a href={href} className={buttonClass(variant, "md")}>
      {children}
    </a>
  );
}

/** An inline text link in the body copy. */
export function TextLink({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  const className = "font-medium text-ink underline decoration-1 hover:decoration-2";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
